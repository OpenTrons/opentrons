import mqtt from 'mqtt'

import { connectionStore } from './store'
import {
  sendDeserializedGenericError,
  deserializeExpectedMessages,
} from './deserialize'
import { unsubscribe } from './unsubscribe'
import { notifyLog } from './notifyLog'
import { HEALTH_STATUS_OK } from '../constants'

import type { NotifyTopic } from '@opentrons/app/src/redux/shell/types'
import type { DiscoveryClientRobot } from '@opentrons/discovery-client'

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

// This is the discovery-client equivalent of "available" robots when viewing the Devices page in the app.
export function getHealthyRobotIPsForNotifications(
  robots: DiscoveryClientRobot[]
): string[] {
  return robots.flatMap(robot =>
    robot.addresses
      .filter(address => address.healthStatus === HEALTH_STATUS_OK)
      .map(address => address.ip)
  )
}

export function cleanUpUnreachableRobots(healthyRobotIPs: string[]): void {
  const healthyRobotIPsSet = new Set(healthyRobotIPs)
  const unreachableRobots = Object.keys(connectionStore).filter(hostname => {
    // The connection is forcefully closed, so remove from the connection store immediately to reduce disconnect packets.
    if (!healthyRobotIPsSet.has(hostname)) {
      connectionStore.deleteHost(hostname)
      return true
    }
    return false
  })
  void closeConnectionsForcefullyFor(unreachableRobots)
}

export function addNewRobotsToConnectionStore(robots: string[]): void {
  const newRobots = robots.filter(hostname =>
    connectionStore.isHostNewlyDiscovered(hostname)
  )
  newRobots.forEach(hostname => {
    connectionStore.setPendingHost(hostname)
    connectAsync(`mqtt://${hostname}`)
      .then(client => {
        notifyLog.debug(`Successfully connected to ${hostname}`)
        connectionStore.setConnectedHost(hostname, client)
        establishListeners({ client, hostname })
      })
      .catch((error: Error) => {
        notifyLog.warn(
          `Failed to connect to ${hostname} - ${error.name}: ${error.message} `
        )
        connectionStore.setFailedToConnectHost(hostname, error)
      })
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

function establishListeners({
  client,
  hostname,
}: {
  client: mqtt.MqttClient
  hostname: string
}): void {
  client.on(
    'message',
    (topic: NotifyTopic, message: Buffer, packet: mqtt.IPublishPacket) => {
      deserializeExpectedMessages(message.toString())
        .then(deserializedMessage => {
          const messageContainsUnsubFlag = 'unsubscribe' in deserializedMessage
          if (messageContainsUnsubFlag) {
            void unsubscribe(hostname, topic)
          }

          notifyLog.debug('Received notification data from main via IPC', {
            hostname,
            topic,
          })
          try {
            const browserWindow = connectionStore.getBrowserWindow()
            browserWindow?.webContents.send(
              'notify',
              hostname,
              topic,
              deserializedMessage
            )
          } catch {} // Prevents shell erroring during app shutdown event.
        })
        .catch(error => notifyLog.debug(`${error.message}`))
    }
  )

  client.on('reconnect', () => {
    notifyLog.debug(`Attempting to reconnect to ${hostname}`)
  })
  // handles transport layer errors only
  client.on('error', error => {
    notifyLog.warn(`Error - ${error.name}: ${error.message}`)
    sendDeserializedGenericError({
      hostname,
      topic: 'ALL_TOPICS',
    })
    client.end()
  })

  client.on('end', () => {
    notifyLog.debug(`Closed connection to ${hostname}`)
    sendDeserializedGenericError({
      hostname,
      topic: 'ALL_TOPICS',
    })
  })

  client.on('disconnect', packet => {
    notifyLog.warn(
      `Disconnected from ${hostname} with code ${
        packet.reasonCode ?? 'undefined'
      }`
    )
    sendDeserializedGenericError({
      hostname,
      topic: 'ALL_TOPICS',
    })
  })
}

export function closeConnectionsForcefullyFor(
  hosts: string[]
): Array<Promise<void>> {
  return hosts.map(hostname => {
    const client = connectionStore.getClient(hostname)
    return new Promise<void>((resolve, reject) =>
      client?.end(true, {}, () => resolve())
    )
  })
}
