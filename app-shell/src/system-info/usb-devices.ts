import assert from 'assert'
import execa from 'execa'
import { usb } from 'usb'
import { isWindows } from '../os'
import { createLogger } from '../log'

import type { UsbDevice } from '@opentrons/app/src/redux/system-info/types'

export type UsbDeviceMonitorOptions = Partial<{
  onDeviceAdd?: (device: UsbDevice) => void
  onDeviceRemove?: (device: UsbDevice) => void
}>

export interface UsbDeviceMonitor {
  getAllDevices: () => Promise<UsbDevice[]>
  stop: () => void
}

const log = createLogger('usb-devices')

const descriptorToDevice = (
  descriptors: usb.Device,
  manufacturerName?: string,
  serialNumber?: string,
  productName?: string
): UsbDevice => ({
  vendorId: descriptors.deviceDescriptor.idVendor,
  productId: descriptors.deviceDescriptor.idProduct,
  serialNumber,
  manufacturerName,
  productName,
})

const getStringDescriptorPromise = (
  device: usb.Device,
  index: number
): Promise<string> =>
  new Promise((resolve, reject) => {
    device.getStringDescriptor(index, (error?, value?) => {
      !!error || !!!value ? reject(error ?? 'no value') : resolve(value)
    })
  })

const idVendor = (device: usb.Device): string =>
  device.deviceDescriptor.idVendor.toString(16)
const idProduct = (device: usb.Device): string =>
  device.deviceDescriptor.idVendor.toString(16)

const orDefault = <T, U>(
  promise: Promise<T>,
  defaulter: (err: any) => U
): Promise<T | U> =>
  promise.then((result: T): T => result).catch((err: any) => defaulter(err))

function upstreamDeviceFromUsbDevice(device: usb.Device): Promise<UsbDevice> {
  return new Promise<usb.Device>((resolve, reject) => {
    try {
      device.open(false)
    } catch (err: any) {
      log.error(
        `Failed to open vid=${idVendor(device)} pid=${idProduct(
          device
        )}: ${err}`
      )
      reject(err)
    }
    resolve(device)
  })
    .then(() =>
      Promise.all([
        orDefault(
          getStringDescriptorPromise(
            device,
            device.deviceDescriptor.iManufacturer
          ),
          (err: any): undefined => {
            log.error(
              `Failed to get manufacturer for vid=${idVendor(
                device
              )} pid=${idProduct(device)}: ${err}`
            )
            return undefined
          }
        ),
        orDefault(
          getStringDescriptorPromise(
            device,
            device.deviceDescriptor.iSerialNumber
          ),
          (err: any): undefined => {
            log.error(
              `Failed to get serial for vid=${idVendor(device)} pid=${idProduct(
                device
              )}: ${err}`
            )
            return undefined
          }
        ),
        orDefault(
          getStringDescriptorPromise(device, device.deviceDescriptor.iProduct),
          (err: any): undefined => {
            log.error(
              `Failed to get product name for vid=${idVendor(
                device
              )} pid=${idProduct(device)}: ${err}`
            )
            return undefined
          }
        ),
      ])
    )

    .then(([manufacturer, serialNumber, productName]) => {
      return descriptorToDevice(device, manufacturer, serialNumber, productName)
    })
    .finally(() => {
      device.close()
    })
}

export function createUsbDeviceMonitor(
  options: UsbDeviceMonitorOptions = {}
): UsbDeviceMonitor {
  const { onDeviceAdd, onDeviceRemove } = options

  if (typeof onDeviceAdd === 'function') {
    usb.on('attach', device => {
      upstreamDeviceFromUsbDevice(device)
        .then(onDeviceAdd)
        .catch(err => {
          log.error(
            `Failed to format added device vid=${idVendor(
              device
            )} pid=${idProduct(device)} for upstream: ${err}`
          )
        })
    })
  }

  if (typeof onDeviceRemove === 'function') {
    usb.on('detach', device => onDeviceRemove(descriptorToDevice(device)))
  }

  return {
    getAllDevices: () =>
      new Promise<usb.Device[]>((resolve, reject) => {
        resolve(usb.getDeviceList())
      }).then(deviceList =>
        Promise.all(deviceList.map(upstreamDeviceFromUsbDevice))
      ),
    stop: () => {
      if (typeof onDeviceAdd === 'function') {
        usb.removeAllListeners('attach')
      }
      if (typeof onDeviceRemove === 'function') {
        usb.removeAllListeners('detach')
      }

      log.debug('usb detection monitoring stopped')
    },
  }
}

const decToHex = (number: number): string =>
  number.toString(16).toUpperCase().padStart(4, '0')

export function getWindowsDriverVersion(
  device: UsbDevice
): Promise<string | null> {
  console.log('getWindowsDriverVersion', device)
  const { vendorId: vidDecimal, productId: pidDecimal, serialNumber } = device
  const [vid, pid] = [decToHex(vidDecimal), decToHex(pidDecimal)]

  // USBDevice serialNumber is  string | undefined
  if (serialNumber == null) {
    return Promise.resolve(null)
  }

  assert(
    isWindows() || process.env.NODE_ENV === 'test',
    `getWindowsDriverVersion cannot be called on ${process.platform}`
  )

  return execa
    .command(
      `Get-PnpDeviceProperty -InstanceID "USB\\VID_${vid}&PID_${pid}\\${serialNumber}" -KeyName "DEVPKEY_Device_DriverVersion" | % { $_.Data }`,
      { shell: 'PowerShell.exe' }
    )
    .then(result => result.stdout.trim())
    .catch(error => {
      log.warn('unable to read Windows USB driver version', {
        device,
        error,
      })
      return null
    })
}
