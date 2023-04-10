// health status
export const HEALTH_STATUS_UNREACHABLE: 'unreachable' = 'unreachable'
export const HEALTH_STATUS_NOT_OK: 'notOk' = 'notOk'
export const HEALTH_STATUS_OK: 'ok' = 'ok'

// health endpoint paths
export const ROBOT_SERVER_HEALTH_PATH = '/health'
export const UPDATE_SERVER_HEALTH_PATH = '/server/update/health'

// mdns service filters
export const DEFAULT_PORT = 31950

// hostname matchers
// ipv6 matcher includes square bracket for backwards compatibility
export const RE_HOSTNAME_IPV6_LL: RegExp = /^\[?(?:fd00|fe80)/
export const RE_HOSTNAME_IPV4_LL: RegExp = /^169\.254\.\d+\.\d+$/
export const RE_HOSTNAME_LOCALHOST: RegExp = /^localhost$/
export const RE_HOSTNAME_LOOPBACK: RegExp = /^127\.0\.0\.1$/

// OT-3 usb connection
// default OT-3 product ID in hex
export const DEFAULT_PRODUCT_ID: '4037' = '4037'
// default opentrons vendor ID in hex
export const DEFAULT_VENDOR_ID: '1b67' = '1b67'
// default OT-3 serial number assigned by usb-bridge
export const DEFAULT_SERIAL: '01121997' = '01121997'
