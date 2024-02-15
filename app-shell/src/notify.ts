/* eslint-disable @typescript-eslint/no-dynamic-delete */
import mqtt from 'mqtt'

import { createLogger } from './log'

import type { BrowserWindow } from 'electron'
import type { NotifyTopic } from '@opentrons/app/src/redux/shell/types'
import type { Action, Dispatch } from './types'

// Manages MQTT broker connections via a connection store, establishing a connection to the broker only if a connection does not
// already exist, and disconnects from the broker when the app is not subscribed to any topics for the given broker.
// A redundant connection to the same broker results in the older connection forcibly closing, which we want to avoid.
// However, redundant subscriptions are permitted and result in the broker sending the retained message for that topic.
// To mitigate redundant connections, the connection manager eagerly adds the host, removing the host if the connection fails.

interface ConnectionStore {
  [hostname: string]: {
    client: mqtt.MqttClient | null
    subscriptions: Record<NotifyTopic, number>
  }
}

const connectionStore: ConnectionStore = {}
const log = createLogger('notify')
// MQTT is somewhat particular about the clientId format and will connect erratically if an unexpected string is supplied.
// This clientId is derived from the mqttjs library.
const CLIENT_ID = 'app-' + Math.random().toString(16).slice(2, 8)

const connectOptions: mqtt.IClientOptions = {
  clientId: CLIENT_ID,
  port: 1883,
  keepalive: 60,
  protocolVersion: 5,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  clean: true,
  resubscribe: true,
}

/**
 * @property {number} qos: "Quality of Service", "at least once". Because we use React Query, which does not trigger
  a render update event if duplicate data is received, we can avoid the additional overhead 
  to guarantee "exactly once" delivery. 
 */
const subscribeOptions: mqtt.IClientSubscribeOptions = {
  qos: 1,
}

export function registerNotify(
  dispatch: Dispatch,
  mainWindow: BrowserWindow
): (action: Action) => unknown {
  return function handleAction(action: Action) {
    switch (action.type) {
      case 'shell:NOTIFY_SUBSCRIBE':
        return subscribe({
          ...action.payload,
          browserWindow: mainWindow,
        })

      case 'shell:NOTIFY_UNSUBSCRIBE':
        return unsubscribe({
          ...action.payload,
          browserWindow: mainWindow,
        })
    }
  }
}

interface NotifyParams {
  browserWindow: BrowserWindow
  hostname: string
  topic: NotifyTopic
}

function subscribe(notifyParams: NotifyParams): Promise<void> {
  const { hostname, topic, browserWindow } = notifyParams
  // true if no subscription (and therefore connection) to host exists
  if (connectionStore[hostname] == null) {
    connectionStore[hostname] = {
      client: null,
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      subscriptions: { [topic]: 1 } as Record<NotifyTopic, number>,
    }
    return connectAsync(`mqtt://${hostname}`)
      .then(client => {
        log.info(`Successfully connected to ${hostname}`)
        connectionStore[hostname].client = client
        establishListeners({ ...notifyParams, client })
        return new Promise<void>(() =>
          client.subscribe(topic, subscribeOptions, subscribeCb)
        )
      })
      .catch((error: Error) => {
        log.warn(
          `Failed to connect to ${hostname} - ${error.name}: ${error.message} `
        )
        const failureMessage = error.message.includes('ECONNREFUSED')
          ? 'ECONNREFUSED'
          : 'ECONNFAILED'

        sendToBrowserDeserialized({
          browserWindow,
          hostname,
          topic,
          message: failureMessage,
        })
        if (hostname in connectionStore) delete connectionStore[hostname]
      })
  }
  // true if the connection store has an entry for the hostname.
  else {
    const subscriptions = connectionStore[hostname]?.subscriptions
    if (subscriptions && subscriptions[topic] > 0) {
      subscriptions[topic] += 1
      return Promise.resolve()
    } else {
      if (subscriptions) {
        subscriptions[topic] = 1
      }
      return new Promise<void>(() => checkIfClientConnected()).catch(() => {
        log.warn(`Failed to subscribe on ${hostname} to topic: ${topic}`)
        sendToBrowserDeserialized({
          browserWindow,
          hostname,
          topic,
          message: 'ECONNFAILED',
        })
        handleDecrementSubscriptionCount(hostname, topic)
      })
    }
  }

  function subscribeCb(error: Error, result: mqtt.ISubscriptionGrant[]): void {
    if (error != null) {
      log.warn(`Failed to subscribe on ${hostname} to topic: ${topic}`)
      sendToBrowserDeserialized({
        browserWindow,
        hostname,
        topic,
        message: 'ECONNFAILED',
      })
      handleDecrementSubscriptionCount(hostname, topic)
    } else {
      log.info(`Successfully subscribed on ${hostname} to topic: ${topic}`)
    }
  }

  // Check every 500ms for 2 seconds before failing.
  function checkIfClientConnected(): void {
    const MAX_RETRIES = 4
    let counter = 0
    const intervalId = setInterval(() => {
      const client = connectionStore[hostname]?.client
      if (client != null) {
        clearInterval(intervalId)
        new Promise<void>(() =>
          client.subscribe(topic, subscribeOptions, subscribeCb)
        )
          .then(() => Promise.resolve())
          .catch(() =>
            Promise.reject(
              new Error(
                `Maximum number of subscription retries reached for hostname: ${hostname}`
              )
            )
          )
      }

      counter++
      if (counter === MAX_RETRIES) {
        clearInterval(intervalId)
        Promise.reject(
          new Error(
            `Maximum number of subscription retries reached for hostname: ${hostname}`
          )
        )
      }
    }, 500)
  }
}

// Because subscription logic is directly tied to the component lifecycle, it is possible
// for a component to trigger an unsubscribe event on dismount while a new component mounts and
// triggers a subscribe event. For the connection store and MQTT to reflect correct topic subscriptions,
// do not unsubscribe and close connections before newly mounted components have had time to update the connection store.
const RENDER_TIMEOUT = 10000 // 10 seconds

function unsubscribe(notifyParams: NotifyParams): Promise<void> {
  const { hostname, topic } = notifyParams
  return new Promise<void>(() => {
    if (hostname in connectionStore) {
      setTimeout(() => {
        const { client } = connectionStore[hostname]
        const subscriptions = connectionStore[hostname]?.subscriptions
        const isLastSubscription = subscriptions[topic] <= 1

        if (isLastSubscription) {
          client?.unsubscribe(topic, {}, (error, result) => {
            if (error != null) {
              log.warn(
                `Failed to unsubscribe on ${hostname} from topic: ${topic}`
              )
            } else {
              log.info(
                `Successfully unsubscribed on ${hostname} from topic: ${topic}`
              )
              handleDecrementSubscriptionCount(hostname, topic)
            }
          })
        } else {
          subscriptions[topic] -= 1
        }
      }, RENDER_TIMEOUT)
    } else {
      log.info(
        `Attempted to unsubscribe from unconnected hostname: ${hostname}`
      )
    }
  })
}

function connectAsync(brokerURL: string): Promise<mqtt.Client> {
  const client = mqtt.connect(brokerURL, connectOptions)

  return new Promise((resolve, reject) => {
    // Listeners added to client to trigger promise resolution
    const promiseListeners: {
      [key: string]: (...args: any[]) => void
    } = {
      connect: () => {
        removePromiseListeners()
        return resolve(client)
      },
      // A connection error event will close the connection without a retry.
      error: (error: Error | string) => {
        removePromiseListeners()
        const clientEndPromise = new Promise((resolve, reject) =>
          client.end(true, {}, () => resolve(error))
        )
        return clientEndPromise.then(() => reject(error))
      },
      end: () => promiseListeners.error(`Couldn't connect to ${brokerURL}`),
    }

    function removePromiseListeners(): void {
      Object.keys(promiseListeners).forEach(eventName => {
        client.removeListener(eventName, promiseListeners[eventName])
      })
    }

    Object.keys(promiseListeners).forEach(eventName => {
      client.on(eventName, promiseListeners[eventName])
    })
  })
}

function handleDecrementSubscriptionCount(
  hostname: string,
  topic: NotifyTopic
): void {
  const { client, subscriptions } = connectionStore[hostname]
  if (topic in subscriptions) {
    subscriptions[topic] -= 1
    if (subscriptions[topic] <= 0) {
      delete subscriptions[topic]
    }
  }

  if (Object.keys(subscriptions).length <= 0) {
    client?.end()
  }
}

interface ListenerParams {
  client: mqtt.MqttClient
  browserWindow: BrowserWindow
  topic: NotifyTopic
  hostname: string
}

function establishListeners({
  client,
  browserWindow,
  hostname,
  topic,
}: ListenerParams): void {
  client.on(
    'message',
    (topic: NotifyTopic, message: Buffer, packet: mqtt.IPublishPacket) => {
      sendToBrowserDeserialized({
        browserWindow,
        hostname,
        topic,
        message: message.toString(),
      })
    }
  )

  client.on('reconnect', () => {
    log.info(`Attempting to reconnect to ${hostname}`)
  })
  // handles transport layer errors only
  client.on('error', error => {
    log.warn(`Error - ${error.name}: ${error.message}`)
    sendToBrowserDeserialized({
      browserWindow,
      hostname,
      topic,
      message: 'ECONNFAILED',
    })
    client.end()
  })

  client.on('end', () => {
    log.info(`Closed connection to ${hostname}`)
    if (hostname in connectionStore) delete connectionStore[hostname]
  })

  client.on('disconnect', packet =>
    log.warn(
      `Disconnected from ${hostname} with code ${
        packet.reasonCode ?? 'undefined'
      }`
    )
  )
}

export function closeAllNotifyConnections(): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(Error('Failed to close all connections within the time limit.'))
    }, 2000)

    log.debug('Stopping notify service connections')
    const closeConnections = Object.values(connectionStore).map(
      ({ client }) => {
        return new Promise((resolve, reject) => {
          client?.end(true, {}, () => resolve(null))
        })
      }
    )
    Promise.all(closeConnections).then(resolve).catch(reject)
  })
}

interface SendToBrowserParams {
  browserWindow: BrowserWindow
  hostname: string
  topic: NotifyTopic
  message: string
}

function sendToBrowserDeserialized({
  browserWindow,
  hostname,
  topic,
  message,
}: SendToBrowserParams): void {
  let deserializedMessage: string | Object

  try {
    deserializedMessage = JSON.parse(message)
  } catch {
    deserializedMessage = message
  }

  log.info('Received notification data from main via IPC', {
    hostname,
    topic,
  })

  browserWindow.webContents.send('notify', hostname, topic, deserializedMessage)
}
