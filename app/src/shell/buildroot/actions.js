// @flow
import type { RobotHost } from '../../robot-api/types'
import type { BuildrootAction, UpdateSessionStep } from './types'

export const BR_UPDATE_INFO: 'buildroot:UPDATE_INFO' = 'buildroot:UPDATE_INFO'

export const BR_DOWNLOAD_PROGRESS: 'buildroot:DOWNLOAD_PROGRESS' =
  'buildroot:DOWNLOAD_PROGRESS'

export const BR_DOWNLOAD_ERROR: 'buildroot:DOWNLOAD_ERROR' =
  'buildroot:DOWNLOAD_ERROR'

export const BR_SET_UPDATE_SEEN: 'buildroot:SET_UPDATE_SEEN' =
  'buildroot:SET_UPDATE_SEEN'

export const BR_START_PREMIGRATION: 'buildroot:START_PREMIGRATION' =
  'buildroot:START_PREMIGRATION'

export const BR_PREMIGRATION_DONE: 'buildroot:PREMIGRATION_DONE' =
  'buildroot:PREMIGRATION_DONE'

export const BR_PREMIGRATION_ERROR: 'buildroot:PREMIGRATION_ERROR' =
  'buildroot:PREMIGRATION_ERROR'

export const BR_START_UPDATE: 'buildroot:START_UPDATE' =
  'buildroot:START_UPDATE'

export const BR_UPLOAD_FILE: 'buildroot:UPLOAD_FILE' = 'buildroot:UPLOAD_FILE'

export const BR_FILE_UPLOAD_DONE: 'buildroot:FILE_UPLOAD_DONE' =
  'buildroot:FILE_UPLOAD_DONE'

export const BR_CLEAR_SESSION: 'buildroot:CLEAR_SESSION' =
  'buildroot:CLEAR_SESSION'

export const BR_UNEXPECTED_ERROR: 'buildroot:UNEXPECTED_ERROR' =
  'buildroot:UNEXPECTED_ERROR'

export const BR_SET_SESSION_STEP: 'buildroot:SET_SESSION_STEP' =
  'buildroot:SET_SESSION_STEP'

export function setBuildrootUpdateSeen(): BuildrootAction {
  return { type: BR_SET_UPDATE_SEEN }
}

export function startBuildrootPremigration(
  payload: RobotHost
): BuildrootAction {
  return { type: BR_START_PREMIGRATION, meta: { shell: true }, payload }
}

export function startBuildrootUpdate(payload: string): BuildrootAction {
  return { type: BR_START_UPDATE, payload }
}

export function uploadBuildrootFile(
  host: RobotHost,
  path: string
): BuildrootAction {
  return {
    type: BR_UPLOAD_FILE,
    payload: { host, path },
    meta: { shell: true },
  }
}

export function setBuildrootSessionStep(
  payload: UpdateSessionStep
): BuildrootAction {
  return { type: BR_SET_SESSION_STEP, payload }
}

export function clearBuildrootSession(): BuildrootAction {
  return { type: BR_CLEAR_SESSION }
}

// TODO(mc, 2019-07-21): flesh this action out
export function unexpectedBuildrootError(): BuildrootAction {
  return { type: BR_UNEXPECTED_ERROR }
}
