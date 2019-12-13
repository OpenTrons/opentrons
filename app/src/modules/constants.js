// @flow

// common constants

export const THERMOCYCLER: 'thermocycler' = 'thermocycler'

export const PREPARABLE_MODULES = [THERMOCYCLER]

// http paths

export const MODULES_PATH: '/modules' = '/modules'

// action type strings

// fetch modules

export const FETCH_MODULES: 'modules:FETCH_MODULES' = 'modules:FETCH_MODULES'

export const FETCH_MODULES_SUCCESS: 'modules:FETCH_MODULES_SUCCESS' =
  'modules:FETCH_MODULES_SUCCESS'

export const FETCH_MODULES_FAILURE: 'modules:FETCH_MODULES_FAILURE' =
  'modules:FETCH_MODULES_FAILURE'

// send module command

export const SEND_MODULE_COMMAND: 'modules:SEND_MODULE_COMMAND' =
  'modules:SEND_MODULE_COMMAND'

export const SEND_MODULE_COMMAND_SUCCESS: 'modules:SEND_MODULE_COMMAND_SUCCESS' =
  'modules:SEND_MODULE_COMMAND_SUCCESS'

export const SEND_MODULE_COMMAND_FAILURE: 'modules:SEND_MODULE_COMMAND_FAILURE' =
  'modules:SEND_MODULE_COMMAND_FAILURE'
