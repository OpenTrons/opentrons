import { DEFAULT_PORT } from './constants'
import { createHealthPoller } from './health-poller'
import { createMdnsBrowser } from './mdns-browser'
import * as Store from './store'

import type { PortInfo } from '@opentrons/usb-bridge/node-client'
import type {
  DiscoveryClient,
  DiscoveryClientConfig,
  DiscoveryClientOptions,
  Address,
  DiscoveryClientRobot,
} from './types'

export function createDiscoveryClient(
  options: DiscoveryClientOptions
): DiscoveryClient {
  const { onListChange, logger } = options
  const { getState, dispatch, subscribe } = Store.createStore()
  const getAddresses = (): Address[] => Store.getAddresses(getState())
  const getRobots = (): DiscoveryClientRobot[] => Store.getRobots(getState())
  const getSerialPorts = (): PortInfo[] => Store.getSerialPorts(getState())
  let unsubscribe: (() => void) | null = null

  const healthPoller = createHealthPoller({
    onPollResult: result => dispatch(Store.healthPolled(result)),
    logger,
  })

  const mdnsBrowser = createMdnsBrowser({
    onService: service => dispatch(Store.serviceFound(service)),
    ports: [DEFAULT_PORT],
    logger,
  })

  const removeRobot = (robotName: string): void => {
    dispatch(Store.removeRobot(robotName))
  }

  const start = (config?: DiscoveryClientConfig): void => {
    const { healthPollInterval, serialPortPollInterval, ...intialState } =
      config ?? {}

    dispatch(Store.initializeState(intialState))

    let prevAddrs = getAddresses()
    let prevRobots = getRobots()

    healthPoller.start({
      list: prevAddrs,
      interval: healthPollInterval,
    })
    mdnsBrowser.start()

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!unsubscribe) {
      unsubscribe = subscribe(() => {
        const addrs = getAddresses()
        const robots = getRobots()

        if (addrs !== prevAddrs) {
          healthPoller.start({ list: addrs })
        }
        if (robots !== prevRobots) onListChange(robots)

        prevAddrs = addrs
        prevRobots = robots
      })
    }
  }

  const stop = (): void => {
    mdnsBrowser.stop()
    healthPoller.stop()
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (unsubscribe) {
      unsubscribe()
      unsubscribe = null
    }
  }

  return {
    getRobots,
    getSerialPorts,
    removeRobot,
    start,
    stop,
  }
}
