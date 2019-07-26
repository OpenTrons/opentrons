// @flow
import type { RobotHost } from '../../robot-api'

export type BuildrootUpdateInfo = {|
  version: string,
  releaseNotes: string,
|}

export type BuildrootStatus = 'balena' | 'migrating' | 'buildroot'

// stage response from API
// update-server/otupdate/buildroot/update_session.py
export type UpdateSessionStage =
  | 'awaiting-file'
  | 'validating'
  | 'writing'
  | 'done'
  | 'ready-for-restart'
  | 'error'

// client-side update process step to decide what UI to display / API to call next
export type UpdateSessionStep =
  | 'premigration'
  | 'premigrationRestart'
  | 'getToken'
  | 'uploadFile'
  | 'processFile'
  | 'commitUpdate'
  | 'restart'
  | 'restarting'
  | 'finished'

export type BuildrootUpdateSession = {|
  robotName: string,
  token: string | null,
  pathPrefix: string | null,
  stage: UpdateSessionStage | null,
  step: UpdateSessionStep | null,
  progress: number | null,
  // TODO(mc, 2019-07-25): error messages
  error: boolean,
|}

export type BuildrootState = {|
  seen: boolean,
  downloadProgress: number | null,
  downloadError: string | null,
  info: BuildrootUpdateInfo | null,
  session: BuildrootUpdateSession | null,
|}

export type StartBuildrootUpdateAction = {|
  type: 'buildroot:START_UPDATE',
  payload: string,
|}

// TODO(mc, 2019-07-19): flesh this action type out so it's actually useful
export type UnexpectedBuildrootError = {|
  type: 'buildroot:UNEXPECTED_ERROR',
|}

export type BuildrootAction =
  | StartBuildrootUpdateAction
  | UnexpectedBuildrootError
  | {| type: 'buildroot:DOWNLOAD_PROGRESS', payload: number |}
  | {| type: 'buildroot:DOWNLOAD_ERROR', payload: string |}
  | {| type: 'buildroot:UPDATE_INFO', payload: BuildrootUpdateInfo | null |}
  | {| type: 'buildroot:SET_UPDATE_SEEN' |}
  | {|
      type: 'buildroot:START_PREMIGRATION',
      payload: RobotHost,
      meta: {| shell: true |},
    |}
  | {| type: 'buildroot:PREMIGRATION_DONE', payload: string |}
  | {| type: 'buildroot:PREMIGRATION_ERROR', payload: string |}
  | {|
      type: 'buildroot:UPLOAD_FILE',
      payload: {| host: RobotHost, path: string |},
      meta: {| shell: true |},
    |}
  | {| type: 'buildroot:FILE_UPLOAD_DONE', payload: string |}
  | {| type: 'buildroot:SET_SESSION_STEP', payload: UpdateSessionStep |}
  | {| type: 'buildroot:CLEAR_SESSION' |}
