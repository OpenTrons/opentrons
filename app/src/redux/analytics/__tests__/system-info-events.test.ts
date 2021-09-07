import { makeEvent } from '../make-event'

import * as SystemInfo from '../../system-info'
import * as Fixtures from '../../system-info/__fixtures__'

import type { State } from '../../types'

jest.mock('../../system-info/selectors')

const getU2EDeviceAnalyticsProps = SystemInfo.getU2EDeviceAnalyticsProps as jest.MockedFunction<
  typeof SystemInfo.getU2EDeviceAnalyticsProps
>

const MOCK_STATE: State = { mockState: true } as any
const MOCK_ANALYTICS_PROPS = {
  'U2E Vendor ID': Fixtures.mockRealtekDevice.vendorId,
  'U2E Product ID': Fixtures.mockRealtekDevice.productId,
  'U2E Serial Number': Fixtures.mockRealtekDevice.serialNumber,
  'U2E Manufacturer': Fixtures.mockRealtekDevice.manufacturer,
  'U2E Device Name': Fixtures.mockRealtekDevice.deviceName,
  'U2E IPv4 Address': '10.0.0.1',
}

describe('system info analytics events', () => {
  beforeEach(() => {
    getU2EDeviceAnalyticsProps.mockImplementation(state => {
      expect(state).toBe(MOCK_STATE)
      return MOCK_ANALYTICS_PROPS
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should trigger an event on systemInfo:INITIALIZED', () => {
    const action = SystemInfo.initialized([Fixtures.mockRealtekDevice], [])
    const result = makeEvent(action, MOCK_STATE)

    return expect(result).resolves.toEqual({
      superProperties: { ...MOCK_ANALYTICS_PROPS, 'U2E IPv4 Address': true },
    })
  })

  it('should trigger an event on systemInfo:USB_DEVICE_ADDED', () => {
    const action = SystemInfo.usbDeviceAdded(Fixtures.mockRealtekDevice)
    const result = makeEvent(action, MOCK_STATE)

    return expect(result).resolves.toEqual({
      superProperties: { ...MOCK_ANALYTICS_PROPS, 'U2E IPv4 Address': true },
    })
  })

  it('should trigger an event on systemInfo:NETWORK_INTERFACES_CHANGED', () => {
    const action = SystemInfo.networkInterfacesChanged([
      Fixtures.mockNetworkInterface,
    ])
    const result = makeEvent(action, MOCK_STATE)

    return expect(result).resolves.toEqual({
      superProperties: { ...MOCK_ANALYTICS_PROPS, 'U2E IPv4 Address': true },
    })
  })

  it('maps no assigned IPv4 address to false', () => {
    getU2EDeviceAnalyticsProps.mockReturnValue({
      ...MOCK_ANALYTICS_PROPS,
      'U2E IPv4 Address': null,
    })

    const action = SystemInfo.initialized([Fixtures.mockRealtekDevice], [])
    const result = makeEvent(action, MOCK_STATE)

    return expect(result).resolves.toEqual({
      superProperties: { ...MOCK_ANALYTICS_PROPS, 'U2E IPv4 Address': false },
    })
  })

  it('should not trigger on systemInfo:INITIALIZED if selector returns null', () => {
    getU2EDeviceAnalyticsProps.mockReturnValue(null)

    const action = SystemInfo.initialized([Fixtures.mockRealtekDevice], [])
    const result = makeEvent(action, MOCK_STATE)

    return expect(result).resolves.toEqual(null)
  })

  it('should not trigger on systemInfo:USB_DEVICE_ADDED if selector returns null', () => {
    getU2EDeviceAnalyticsProps.mockReturnValue(null)

    const action = SystemInfo.usbDeviceAdded(Fixtures.mockRealtekDevice)
    const result = makeEvent(action, MOCK_STATE)

    return expect(result).resolves.toEqual(null)
  })

  it('should not trigger on systemInfo:NETWORK_INTERFACES_CHANGED if selector returns null', () => {
    getU2EDeviceAnalyticsProps.mockReturnValue(null)

    const action = SystemInfo.networkInterfacesChanged([
      Fixtures.mockNetworkInterface,
    ])
    const result = makeEvent(action, MOCK_STATE)
    return expect(result).resolves.toEqual(null)
  })
})
