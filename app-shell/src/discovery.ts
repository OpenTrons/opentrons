// app shell discovery module
import { app, ipcMain, IpcMainInvokeEvent } from 'electron'
import Store from 'electron-store'
import groupBy from 'lodash/groupBy'
import throttle from 'lodash/throttle'
import axios, { AxiosRequestConfig } from 'axios'

import {
  createDiscoveryClient,
  DEFAULT_PORT,
  DEFAULT_PRODUCT_ID,
  DEFAULT_VENDOR_ID,
} from '@opentrons/discovery-client'
import {
  fetchSerialPortList,
  SerialPortHttpAgent,
} from '@opentrons/usb-bridge/node-client'

import { UI_INITIALIZED } from '@opentrons/app/src/redux/shell/actions'
import {
  DISCOVERY_START,
  DISCOVERY_FINISH,
  DISCOVERY_REMOVE,
  CLEAR_CACHE,
} from '@opentrons/app/src/redux/discovery/actions'
import {
  INITIALIZED as SYSTEM_INFO_INITIALIZED,
  USB_DEVICE_ADDED,
  USB_DEVICE_REMOVED,
} from '@opentrons/app/src/redux/system-info/constants'

import { getFullConfig, handleConfigChange } from './config'
import { createLogger } from './log'

import type { Agent } from 'http'

import type { UsbDevice } from '@opentrons/app/src/redux/system-info/types'
import type {
  Address,
  DiscoveryClientRobot,
  LegacyService,
  DiscoveryClient,
} from '@opentrons/discovery-client'
import type { PortInfo } from '@opentrons/usb-bridge/node-client'

import type { Action, Dispatch } from './types'
import type { Config } from './config'

const log = createLogger('discovery')

// TODO(mc, 2018-08-09): values picked arbitrarily and should be researched
const FAST_POLL_INTERVAL_MS = 3000
const SLOW_POLL_INTERVAL_MS = 15000
const UPDATE_THROTTLE_MS = 500

interface DiscoveryStore {
  robots: DiscoveryClientRobot[]
  services?: LegacyService[]
}

let config: Config['discovery']
let store: Store<DiscoveryStore>
let client: DiscoveryClient

const makeManualAddresses = (addrs: string | string[]): Address[] => {
  return ['fd00:0:cafe:fefe::1']
    .concat(addrs)
    .map(ip => ({ ip, port: DEFAULT_PORT }))
}

const migrateLegacyServices = (
  legacyServices: LegacyService[]
): DiscoveryClientRobot[] => {
  const servicesByName = groupBy<LegacyService>(legacyServices, 'name')

  return Object.keys(servicesByName).map((name: string) => {
    const services = servicesByName[name]
    const addresses = services.flatMap((service: LegacyService) => {
      const { ip, port } = service
      return ip != null
        ? [
            {
              ip,
              port,
              seen: false,
              healthStatus: null,
              serverHealthStatus: null,
              healthError: null,
              serverHealthError: null,
              advertisedModel: null,
            },
          ]
        : []
    })

    return { name, health: null, serverHealth: null, addresses }
  })
}

export function registerDiscovery(
  dispatch: Dispatch
): (action: Action) => unknown {
  const handleRobotListChange = throttle(handleRobots, UPDATE_THROTTLE_MS)

  config = getFullConfig().discovery
  store = new Store({
    name: 'discovery',
    defaults: { robots: [] as DiscoveryClientRobot[] },
  })

  let disableCache = config.disableCache
  let initialRobots: DiscoveryClientRobot[] = []

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!disableCache) {
    const legacyCachedServices: LegacyService[] | undefined = store.get(
      'services',
      // @ts-expect-error(mc, 2021-02-16): tweak these type definitions
      null
    )

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (legacyCachedServices) {
      initialRobots = migrateLegacyServices(legacyCachedServices)
      store.delete('services')
    } else {
      initialRobots = store.get('robots', [])
    }
  }

  client = createDiscoveryClient({
    onListChange: handleRobotListChange,
    logger: log,
  })

  client.start({
    initialRobots,
    healthPollInterval: SLOW_POLL_INTERVAL_MS,
    serialPortPollInterval: FAST_POLL_INTERVAL_MS,
    manualAddresses: makeManualAddresses(config.candidates),
  })

  handleConfigChange('discovery.candidates', (value: string | string[]) => {
    client.start({ manualAddresses: makeManualAddresses(value) })
  })

  handleConfigChange('discovery.disableCache', (value: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-boolean-literal-compare
    if (value === true) {
      disableCache = value
      store.set('robots', [])
      clearCache()
    }
  })

  app.once('will-quit', () => {
    client.stop()
  })

  let usbHttpAgent: Agent
  // let destroyHttpAgent: () => void

  async function usbListener(
    _event: IpcMainInvokeEvent,
    config: AxiosRequestConfig
  ): Promise<unknown> {
    try {
      const response = await axios.request({
        httpAgent: usbHttpAgent,
        ...config,
      })
      return { data: response.data }
    } catch (e) {
      log.debug(`usbListener error ${JSON.stringify(e)}`)
    }
  }

  function isUsbDeviceOt3(device: UsbDevice): boolean {
    return (
      device.productId === parseInt(DEFAULT_PRODUCT_ID, 16) &&
      device.vendorId === parseInt(DEFAULT_VENDOR_ID, 16)
    )
  }

  return function handleIncomingAction(action: Action) {
    log.debug('handling action in discovery', { action })

    switch (action.type) {
      case UI_INITIALIZED:
      case DISCOVERY_START:
        handleRobots()
        return client.start({
          healthPollInterval: FAST_POLL_INTERVAL_MS,
          serialPortPollInterval: FAST_POLL_INTERVAL_MS,
        })

      case DISCOVERY_FINISH:
        return client.start({
          healthPollInterval: SLOW_POLL_INTERVAL_MS,
          serialPortPollInterval: FAST_POLL_INTERVAL_MS,
        })

      case DISCOVERY_REMOVE:
        return client.removeRobot(
          (action.payload as { robotName: string }).robotName
        )

      case CLEAR_CACHE:
        return clearCache()
      case SYSTEM_INFO_INITIALIZED:
        if (action.payload.usbDevices.find(isUsbDeviceOt3) != null) {
          // TODO: extract and use within USB_DEVICE_ADDED
          fetchSerialPortList()
            .then((list: PortInfo[]) => {
              log.debug('serialportlist', list)
              const ot3UsbSerialPort = list.find(
                port =>
                  port.productId === DEFAULT_PRODUCT_ID &&
                  port.vendorId === DEFAULT_VENDOR_ID
              )

              // TODO: handle null case properly
              // const httpAgent = client.createHttpAgent?.(
              //   ot3UsbSerialPort?.path ?? 'no path found'
              // )

              const httpAgent = new SerialPortHttpAgent({
                maxFreeSockets: 1,
                maxSockets: 1,
                maxTotalSockets: 1,
                keepAlive: true,
                keepAliveMsecs: 10000,
                path: ot3UsbSerialPort?.path ?? '',
              })

              usbHttpAgent = httpAgent as Agent
              // destroyHttpAgent = httpAgent?.destroy ?? (() => {})

              ipcMain.handle('usb:request', usbListener)
              client.start({
                healthPollInterval: FAST_POLL_INTERVAL_MS,
                serialPortPollInterval: FAST_POLL_INTERVAL_MS,
                manualAddresses: [
                  {
                    ip: 'opentrons-usb',
                    // ip: '10.13.11.65',
                    port: DEFAULT_PORT,
                    agent: usbHttpAgent,
                  },
                ],
              })
            })
            .catch(e =>
              log.debug(`fetchSerialPortList error ${JSON.stringify(e)}`)
            )
        }
        break
      case USB_DEVICE_ADDED:
        if (isUsbDeviceOt3(action.payload.usbDevice)) {
          // TODO: fetch serial ports as above
          // const ot3UsbSerialPort = client
          //   .getSerialPorts?.()
          //   .find(
          //     port =>
          //       port.productId === DEFAULT_PRODUCT_ID &&
          //       port.vendorId === DEFAULT_VENDOR_ID
          //   )
          // // TODO: handle null case properly
          // const httpAgent = client.createHttpAgent?.(
          //   ot3UsbSerialPort?.path ?? 'no path found'
          // )
          // destroyHttpAgent = httpAgent?.destroy ?? (() => {})
          // ipcMain.handle('usb:request', usbListener)
          // client.start({
          //   healthPollInterval: FAST_POLL_INTERVAL_MS,
          //   serialPortPollInterval: FAST_POLL_INTERVAL_MS,
          //   manualAddresses: [
          //     {
          //       ip: 'opentrons-usb.com',
          //       port: DEFAULT_PORT,
          //       agent: usbHttpAgent,
          //     },
          //   ],
          // })
        }
        break
      case USB_DEVICE_REMOVED:
        if (isUsbDeviceOt3(action.payload.usbDevice)) {
          // TODO: should probably close serialport here
          // destroyHttpAgent?.()
          ipcMain.removeHandler('usb:request')
          client.start({
            healthPollInterval: FAST_POLL_INTERVAL_MS,
            serialPortPollInterval: FAST_POLL_INTERVAL_MS,
            manualAddresses: [],
          })
        }
        break
    }
  }

  function handleRobots(): void {
    const robots = client.getRobots()

    if (!disableCache) store.set('robots', robots)

    dispatch({
      type: 'discovery:UPDATE_LIST',
      payload: { robots },
    })
  }

  function clearCache(): void {
    client.start({ initialRobots: [] })
  }
}
