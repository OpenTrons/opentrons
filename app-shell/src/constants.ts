import type {
  UI_INITIALIZED_TYPE,
  CONFIG_INITIALIZED_TYPE,
  CONFIG_UPDATE_VALUE_TYPE,
  CONFIG_RESET_VALUE_TYPE,
  CONFIG_TOGGLE_VALUE_TYPE,
  CONFIG_ADD_UNIQUE_VALUE_TYPE,
  CONFIG_SUBTRACT_VALUE_TYPE,
  CONFIG_VALUE_UPDATED_TYPE,
  POLL_TYPE,
  INITIAL_TYPE,
  ADD_LABWARE_TYPE,
  DELETE_LABWARE_TYPE,
  OVERWRITE_LABWARE_TYPE,
  CHANGE_DIRECTORY_TYPE,
  FETCH_CUSTOM_LABWARE_TYPE,
  CUSTOM_LABWARE_LIST_TYPE,
  CUSTOM_LABWARE_LIST_FAILURE_TYPE,
  CHANGE_CUSTOM_LABWARE_DIRECTORY_TYPE,
  ADD_CUSTOM_LABWARE_TYPE,
  ADD_CUSTOM_LABWARE_FILE_TYPE,
  ADD_CUSTOM_LABWARE_FAILURE_TYPE,
  CLEAR_ADD_CUSTOM_LABWARE_FAILURE_TYPE,
  ADD_NEW_LABWARE_NAME_TYPE,
  CLEAR_NEW_LABWARE_NAME_TYPE,
  OPEN_CUSTOM_LABWARE_DIRECTORY_TYPE,
  DELETE_CUSTOM_LABWARE_FILE_TYPE,
  INVALID_LABWARE_FILE_TYPE,
  DUPLICATE_LABWARE_FILE_TYPE,
  OPENTRONS_LABWARE_FILE_TYPE,
  VALID_LABWARE_FILE_TYPE,
  OPEN_PYTHON_DIRECTORY_TYPE,
  CHANGE_PYTHON_PATH_OVERRIDE_TYPE,
  FETCH_PROTOCOLS_TYPE,
  UPDATE_PROTOCOL_LIST_TYPE,
  UPDATE_PROTOCOL_LIST_FAILURE_TYPE,
  ADD_PROTOCOL_TYPE,
  REMOVE_PROTOCOL_TYPE,
  ADD_PROTOCOL_FAILURE_TYPE,
  CLEAR_ADD_PROTOCOL_FAILURE_TYPE,
  OPEN_PROTOCOL_DIRECTORY_TYPE,
  ANALYZE_PROTOCOL_TYPE,
  ANALYZE_PROTOCOL_SUCCESS_TYPE,
  ANALYZE_PROTOCOL_FAILURE_TYPE,
  VIEW_PROTOCOL_SOURCE_FOLDER_TYPE,
  PROTOCOL_ADDITION_TYPE,
  OPENTRONS_USB_TYPE,
  SYSTEM_INFO_INITIALIZED_TYPE,
  USB_DEVICE_ADDED_TYPE,
  USB_DEVICE_REMOVED_TYPE,
  NETWORK_INTERFACES_CHANGED_TYPE,
  U2E_DRIVER_OUTDATED_MESSAGE_TYPE,
  U2E_DRIVER_DESCRIPTION_TYPE,
  U2E_DRIVER_OUTDATED_CTA_TYPE,
  DISCOVERY_START_TYPE,
  DISCOVERY_FINISH_TYPE,
  DISCOVERY_UPDATE_LIST_TYPE,
  DISCOVERY_REMOVE_TYPE,
  CLEAR_CACHE_TYPE,
  USB_HTTP_REQUESTS_START_TYPE,
  USB_HTTP_REQUESTS_STOP_TYPE,
  APP_RESTART_TYPE,
  RELOAD_UI_TYPE,
  SEND_LOG_TYPE,
  EDIT_PROTOCOL_TYPE,
  SET_EDITING_PROTOCOL_SOURCE_TYPE,
} from './types'

// these constants are all copied over from the app

export const UI_INITIALIZED: UI_INITIALIZED_TYPE = 'shell:UI_INITIALIZED'
export const CONFIG_INITIALIZED: CONFIG_INITIALIZED_TYPE = 'config:INITIALIZED'
export const UPDATE_VALUE: CONFIG_UPDATE_VALUE_TYPE = 'config:UPDATE_VALUE'
export const RESET_VALUE: CONFIG_RESET_VALUE_TYPE = 'config:RESET_VALUE'
export const TOGGLE_VALUE: CONFIG_TOGGLE_VALUE_TYPE = 'config:TOGGLE_VALUE'
export const ADD_UNIQUE_VALUE: CONFIG_ADD_UNIQUE_VALUE_TYPE =
  'config:ADD_UNIQUE_VALUE'
export const SUBTRACT_VALUE: CONFIG_SUBTRACT_VALUE_TYPE =
  'config:SUBTRACT_VALUE'
export const VALUE_UPDATED: CONFIG_VALUE_UPDATED_TYPE = 'config:VALUE_UPDATED'

// custom labware

export const FETCH_CUSTOM_LABWARE: FETCH_CUSTOM_LABWARE_TYPE =
  'labware:FETCH_CUSTOM_LABWARE'

export const CUSTOM_LABWARE_LIST: CUSTOM_LABWARE_LIST_TYPE =
  'labware:CUSTOM_LABWARE_LIST'

export const CUSTOM_LABWARE_LIST_FAILURE: CUSTOM_LABWARE_LIST_FAILURE_TYPE =
  'labware:CUSTOM_LABWARE_LIST_FAILURE'

export const CHANGE_CUSTOM_LABWARE_DIRECTORY: CHANGE_CUSTOM_LABWARE_DIRECTORY_TYPE =
  'labware:CHANGE_CUSTOM_LABWARE_DIRECTORY'

export const ADD_CUSTOM_LABWARE: ADD_CUSTOM_LABWARE_TYPE =
  'labware:ADD_CUSTOM_LABWARE'

export const ADD_CUSTOM_LABWARE_FILE: ADD_CUSTOM_LABWARE_FILE_TYPE =
  'labware:ADD_CUSTOM_LABWARE_FILE'

export const ADD_CUSTOM_LABWARE_FAILURE: ADD_CUSTOM_LABWARE_FAILURE_TYPE =
  'labware:ADD_CUSTOM_LABWARE_FAILURE'

export const CLEAR_ADD_CUSTOM_LABWARE_FAILURE: CLEAR_ADD_CUSTOM_LABWARE_FAILURE_TYPE =
  'labware:CLEAR_ADD_CUSTOM_LABWARE_FAILURE'

export const ADD_NEW_LABWARE_NAME: ADD_NEW_LABWARE_NAME_TYPE =
  'labware:ADD_NEW_LABWARE_NAME'

export const CLEAR_NEW_LABWARE_NAME: CLEAR_NEW_LABWARE_NAME_TYPE =
  'labware:CLEAR_NEW_LABWARE_NAME'

export const OPEN_CUSTOM_LABWARE_DIRECTORY: OPEN_CUSTOM_LABWARE_DIRECTORY_TYPE =
  'labware:OPEN_CUSTOM_LABWARE_DIRECTORY'

export const DELETE_CUSTOM_LABWARE_FILE: DELETE_CUSTOM_LABWARE_FILE_TYPE =
  'labware:DELETE_CUSTOM_LABWARE_FILE'
// action meta literals

export const POLL: POLL_TYPE = 'poll'
export const INITIAL: INITIAL_TYPE = 'initial'
export const ADD_LABWARE: ADD_LABWARE_TYPE = 'addLabware'
export const DELETE_LABWARE: DELETE_LABWARE_TYPE = 'deleteLabware'
export const OVERWRITE_LABWARE: OVERWRITE_LABWARE_TYPE = 'overwriteLabware'
export const CHANGE_DIRECTORY: CHANGE_DIRECTORY_TYPE = 'changeDirectory'

// other constants

export const LABWARE_DIRECTORY_CONFIG_PATH = 'labware.directory'

export const INVALID_LABWARE_FILE: INVALID_LABWARE_FILE_TYPE =
  'INVALID_LABWARE_FILE'

export const DUPLICATE_LABWARE_FILE: DUPLICATE_LABWARE_FILE_TYPE =
  'DUPLICATE_LABWARE_FILE'

export const OPENTRONS_LABWARE_FILE: OPENTRONS_LABWARE_FILE_TYPE =
  'OPENTRONS_LABWARE_FILE'

export const VALID_LABWARE_FILE: VALID_LABWARE_FILE_TYPE = 'VALID_LABWARE_FILE'

export const OPEN_PYTHON_DIRECTORY: OPEN_PYTHON_DIRECTORY_TYPE =
  'protocol-analysis:OPEN_PYTHON_DIRECTORY'

export const CHANGE_PYTHON_PATH_OVERRIDE: CHANGE_PYTHON_PATH_OVERRIDE_TYPE =
  'protocol-analysis:CHANGE_PYTHON_PATH_OVERRIDE'

export const FETCH_PROTOCOLS: FETCH_PROTOCOLS_TYPE =
  'protocolStorage:FETCH_PROTOCOLS'

export const UPDATE_PROTOCOL_LIST: UPDATE_PROTOCOL_LIST_TYPE =
  'protocolStorage:UPDATE_PROTOCOL_LIST'

export const UPDATE_PROTOCOL_LIST_FAILURE: UPDATE_PROTOCOL_LIST_FAILURE_TYPE =
  'protocolStorage:UPDATE_PROTOCOL_LIST_FAILURE'

export const ADD_PROTOCOL: ADD_PROTOCOL_TYPE = 'protocolStorage:ADD_PROTOCOL'

export const REMOVE_PROTOCOL: REMOVE_PROTOCOL_TYPE =
  'protocolStorage:REMOVE_PROTOCOL'

export const ADD_PROTOCOL_FAILURE: ADD_PROTOCOL_FAILURE_TYPE =
  'protocolStorage:ADD_PROTOCOL_FAILURE'

export const CLEAR_ADD_PROTOCOL_FAILURE: CLEAR_ADD_PROTOCOL_FAILURE_TYPE =
  'protocolStorage:CLEAR_ADD_PROTOCOL_FAILURE'

export const OPEN_PROTOCOL_DIRECTORY: OPEN_PROTOCOL_DIRECTORY_TYPE =
  'protocolStorage:OPEN_PROTOCOL_DIRECTORY'

export const ANALYZE_PROTOCOL: ANALYZE_PROTOCOL_TYPE =
  'protocolStorage:ANALYZE_PROTOCOL'

export const ANALYZE_PROTOCOL_SUCCESS: ANALYZE_PROTOCOL_SUCCESS_TYPE =
  'protocolStorage:ANALYZE_PROTOCOL_SUCCESS'

export const ANALYZE_PROTOCOL_FAILURE: ANALYZE_PROTOCOL_FAILURE_TYPE =
  'protocolStorage:ANALYZE_PROTOCOL_FAILURE'

export const EDIT_PROTOCOL: EDIT_PROTOCOL_TYPE =
  'protocolStorage:EDIT_PROTOCOL'

export const VIEW_PROTOCOL_SOURCE_FOLDER: VIEW_PROTOCOL_SOURCE_FOLDER_TYPE =
  'protocolStorage:VIEW_PROTOCOL_SOURCE_FOLDER'

export const SET_EDITING_PROTOCOL_SOURCE: SET_EDITING_PROTOCOL_SOURCE_TYPE =
  'protocolStorage:SET_EDITING_PROTOCOL_SOURCE'

export const PROTOCOL_ADDITION: PROTOCOL_ADDITION_TYPE = 'protocolAddition'

export const OPENTRONS_USB: OPENTRONS_USB_TYPE = 'opentrons-usb'

export const U2E_DRIVER_UPDATE_URL =
  'https://www.realtek.com/en/component/zoo/category/network-interface-controllers-10-100-1000m-gigabit-ethernet-usb-3-0-software'

// driver statuses

export const NOT_APPLICABLE: 'NOT_APPLICABLE' = 'NOT_APPLICABLE'
export const UNKNOWN: 'UNKNOWN' = 'UNKNOWN'
export const UP_TO_DATE: 'UP_TO_DATE' = 'UP_TO_DATE'
export const OUTDATED: 'OUTDATED' = 'OUTDATED'

// action types

export const SYSTEM_INFO_INITIALIZED: SYSTEM_INFO_INITIALIZED_TYPE =
  'systemInfo:INITIALIZED'

export const USB_DEVICE_ADDED: USB_DEVICE_ADDED_TYPE =
  'systemInfo:USB_DEVICE_ADDED'

export const USB_DEVICE_REMOVED: USB_DEVICE_REMOVED_TYPE =
  'systemInfo:USB_DEVICE_REMOVED'

export const NETWORK_INTERFACES_CHANGED: NETWORK_INTERFACES_CHANGED_TYPE =
  'systemInfo:NETWORK_INTERFACES_CHANGED'

export const USB_HTTP_REQUESTS_START: USB_HTTP_REQUESTS_START_TYPE =
  'shell:USB_HTTP_REQUESTS_START'
export const USB_HTTP_REQUESTS_STOP: USB_HTTP_REQUESTS_STOP_TYPE =
  'shell:USB_HTTP_REQUESTS_STOP'
export const APP_RESTART: APP_RESTART_TYPE = 'shell:APP_RESTART'
export const RELOAD_UI: RELOAD_UI_TYPE = 'shell:RELOAD_UI'
export const SEND_LOG: SEND_LOG_TYPE = 'shell:SEND_LOG'

export const UPDATE_BRIGHTNESS: 'shell:UPDATE_BRIGHTNESS' =
  'shell:UPDATE_BRIGHTNESS'
export const ROBOT_MASS_STORAGE_DEVICE_ADDED: 'shell:ROBOT_MASS_STORAGE_DEVICE_ADDED' =
  'shell:ROBOT_MASS_STORAGE_DEVICE_ADDED'
export const ROBOT_MASS_STORAGE_DEVICE_REMOVED: 'shell:ROBOT_MASS_STORAGE_DEVICE_REMOVED' =
  'shell:ROBOT_MASS_STORAGE_DEVICE_REMOVED'
export const ROBOT_MASS_STORAGE_DEVICE_ENUMERATED: 'shell:ROBOT_MASS_STORAGE_DEVICE_ENUMERATED' =
  'shell:ROBOT_MASS_STORAGE_DEVICE_ENUMERATED'
export const NOTIFY_SUBSCRIBE: 'shell:NOTIFY_SUBSCRIBE' =
  'shell:NOTIFY_SUBSCRIBE'

// copy
// TODO(mc, 2020-05-11): i18n
export const U2E_DRIVER_OUTDATED_MESSAGE: U2E_DRIVER_OUTDATED_MESSAGE_TYPE =
  'There is an updated Realtek USB-to-Ethernet adapter driver available for your computer.'
export const U2E_DRIVER_DESCRIPTION: U2E_DRIVER_DESCRIPTION_TYPE =
  'The OT-2 uses this adapter for its USB connection to the Opentrons App.'
export const U2E_DRIVER_OUTDATED_CTA: U2E_DRIVER_OUTDATED_CTA_TYPE =
  "Please update your computer's driver to ensure a reliable connection to your OT-2."

export const DISCOVERY_START: DISCOVERY_START_TYPE = 'discovery:START'

export const DISCOVERY_FINISH: DISCOVERY_FINISH_TYPE = 'discovery:FINISH'

export const DISCOVERY_UPDATE_LIST: DISCOVERY_UPDATE_LIST_TYPE =
  'discovery:UPDATE_LIST'

export const DISCOVERY_REMOVE: DISCOVERY_REMOVE_TYPE = 'discovery:REMOVE'

export const CLEAR_CACHE: CLEAR_CACHE_TYPE = 'discovery:CLEAR_CACHE'
export const HEALTH_STATUS_OK: 'ok' = 'ok'
export const HEALTH_STATUS_NOT_OK: 'notOk' = 'notOk'
export const FAILURE_STATUSES = {
  ECONNREFUSED: 'ECONNREFUSED',
  ECONNFAILED: 'ECONNFAILED',
} as const
