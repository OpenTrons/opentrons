// @flow
// system-info types

import typeof {
  INITIALIZED,
  USB_DEVICE_ADDED,
  USB_DEVICE_REMOVED,
  NOT_APPLICABLE,
  UNKNOWN,
  UP_TO_DATE,
  OUTDATED,
} from './constants'

export type UsbDevice = {|
  locationId: number,
  vendorId: number,
  productId: number,
  deviceName: string,
  manufacturer: string,
  serialNumber: string,
  deviceAddress: number,
  windowsDriverVersion?: string | null,
|}

export type DriverStatus = NOT_APPLICABLE | UNKNOWN | UP_TO_DATE | OUTDATED

export type U2EAnalyticsProps = {|
  'U2E Vendor ID': number,
  'U2E Product ID': number,
  'U2E Serial Number': string,
  'U2E Device Name': string,
  'U2E Manufacturer': string,
  'U2E Windows Driver Version'?: string | null,
|}

// TODO(mc, 2020-04-17): add other system info
export type SystemInfoState = {|
  usbDevices: Array<UsbDevice>,
|}

// TODO(mc, 2020-04-17): add other system info
export type InitializedAction = {|
  type: INITIALIZED,
  payload: {| usbDevices: Array<UsbDevice> |},
|}

export type UsbDeviceAddedAction = {|
  type: USB_DEVICE_ADDED,
  payload: {| usbDevice: UsbDevice |},
|}

export type UsbDeviceRemovedAction = {|
  type: USB_DEVICE_REMOVED,
  payload: {| usbDevice: UsbDevice |},
|}

export type SystemInfoAction =
  | InitializedAction
  | UsbDeviceAddedAction
  | UsbDeviceRemovedAction
