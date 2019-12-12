// @flow

import * as Constants from './constants'
import * as Types from './types'

import type { RobotApiRequestMeta } from '../robot-api/types'

// fetch modules

export const fetchModules = (robotName: string): Types.FetchModulesAction => ({
  type: Constants.FETCH_MODULES,
  payload: { robotName },
  meta: {},
})

export const fetchModulesSuccess = (
  robotName: string,
  modules: Array<Types.AttachedModule>,
  meta: RobotApiRequestMeta
): Types.FetchModulesSuccessAction => ({
  type: Constants.FETCH_MODULES_SUCCESS,
  payload: { robotName, modules },
  meta,
})

export const fetchModulesFailure = (
  robotName: string,
  error: {},
  meta: RobotApiRequestMeta
): Types.FetchModulesFailureAction => ({
  type: Constants.FETCH_MODULES_FAILURE,
  payload: { robotName, error },
  meta,
})

// send module command

export const sendModuleCommand = (
  robotName: string,
  moduleId: string,
  command: Types.ModuleCommand,
  args: Array<mixed>
): Types.SendModuleCommandAction => ({
  type: Constants.SEND_MODULE_COMMAND,
  payload: { robotName, moduleId, command, args },
  meta: {},
})

export const sendModuleCommandSuccess = (
  robotName: string,
  moduleId: string,
  command: Types.ModuleCommand,
  returnValue: mixed,
  meta: RobotApiRequestMeta
): Types.SendModuleCommandSuccessAction => ({
  type: Constants.SEND_MODULE_COMMAND_SUCCESS,
  payload: { robotName, moduleId, command, returnValue },
  meta,
})

export const sendModuleCommandFailure = (
  robotName: string,
  moduleId: string,
  command: Types.ModuleCommand,
  error: {},
  meta: RobotApiRequestMeta
): Types.SendModuleCommandFailureAction => ({
  type: Constants.SEND_MODULE_COMMAND_FAILURE,
  payload: { robotName, moduleId, command, error },
  meta,
})
