import type { IpcMainEvent } from 'electron'
import type { Error } from '../types'
import type { RobotSystemAction } from './is-ready/types'

export interface Remote {
  ipcRenderer: {
    invoke: (channel: string, ...args: unknown[]) => Promise<any>
    send: (channel: string, ...args: unknown[]) => void
    on: (
      channel: string,
      listener: (
        event: IpcMainEvent,
        hostname: string,
        topic: NotifyTopic,
        message: NotifyResponseData | NotifyNetworkError,
        ...args: unknown[]
      ) => void
    ) => void
  }
}

interface NotifyRefetchData {
  refetchUsingHTTP: boolean
  statusCode: never
}

export type NotifyNetworkError = 'ECONNFAILED' | 'ECONNREFUSED'
export type NotifyResponseData = NotifyRefetchData | NotifyNetworkError

interface File {
  sha512: string
  url: string
  [key: string]: unknown
}
export interface UpdateInfo {
  version: string
  files: File[]
  releaseDate?: string
  releaseNotes?: string
}

export interface ShellUpdateState {
  checking: boolean
  downloading: boolean
  available: boolean
  downloaded: boolean
  downloadPercentage: number
  error: Error | null | undefined
  info: UpdateInfo | null | undefined
}

export type ShellUpdateAction =
  | { type: 'shell:CHECK_UPDATE'; meta: { shell: true } }
  | {
      type: 'shell:CHECK_UPDATE_RESULT'
      payload: { available?: boolean; info?: UpdateInfo | null; error?: Error }
    }
  | { type: 'shell:DOWNLOAD_UPDATE'; meta: { shell: true } }
  | { type: 'shell:DOWNLOAD_UPDATE_RESULT'; payload: { error?: Error } }
  | { type: 'shell:APPLY_UPDATE'; meta: { shell: true } }
  | { type: 'shell:DOWNLOAD_PERCENTAGE'; payload: { percent: number } }

export interface ShellState {
  update: ShellUpdateState
  isReady: boolean
}

export interface UiInitializedAction {
  type: 'shell:UI_INITIALIZED'
  meta: { shell: true }
}

export type UsbRequestsAction =
  | { type: 'shell:USB_HTTP_REQUESTS_START'; meta: { shell: true } }
  | { type: 'shell:USB_HTTP_REQUESTS_STOP'; meta: { shell: true } }

export interface AppRestartAction {
  type: 'shell:APP_RESTART'
  payload: {
    message: string
  }
  meta: { shell: true }
}

export interface ReloadUiAction {
  type: 'shell:RELOAD_UI'
  payload: {
    message: string
  }
  meta: { shell: true }
}

export interface SendLogAction {
  type: 'shell:SEND_LOG'
  payload: {
    message: string
  }
  meta: { shell: true }
}

export interface UpdateBrightnessAction {
  type: 'shell:UPDATE_BRIGHTNESS'
  payload: {
    message: string
  }
  meta: { shell: true }
}

export interface RobotMassStorageDeviceAdded {
  type: 'shell:ROBOT_MASS_STORAGE_DEVICE_ADDED'
  payload: {
    rootPath: string
  }
  meta: { shell: true }
}

export interface RobotMassStorageDeviceEnumerated {
  type: 'shell:ROBOT_MASS_STORAGE_DEVICE_ENUMERATED'
  payload: {
    rootPath: string
    filePaths: string[]
  }
  meta: { shell: true }
}

export interface RobotMassStorageDeviceRemoved {
  type: 'shell:ROBOT_MASS_STORAGE_DEVICE_REMOVED'
  payload: {
    rootPath: string
  }
  meta: { shell: true }
}

export type NotifyTopic =
  | 'robot-server/maintenance_runs/current_run'
  | 'robot-server/runs/current_command'
  | 'robot-server/runs'
  | `robot-server/runs/${string}`

export type NotifyAction = 'subscribe' | 'unsubscribe'

export interface NotifySubscribeAction {
  type: 'shell:NOTIFY_SUBSCRIBE'
  payload: {
    hostname: string
    topic: NotifyTopic
  }
  meta: { shell: true }
}

export interface NotifyUnsubscribeAction {
  type: 'shell:NOTIFY_UNSUBSCRIBE'
  payload: {
    hostname: string
    topic: NotifyTopic
  }
  meta: { shell: true }
}

export type ShellAction =
  | UiInitializedAction
  | ShellUpdateAction
  | RobotSystemAction
  | UsbRequestsAction
  | AppRestartAction
  | ReloadUiAction
  | SendLogAction
  | UpdateBrightnessAction
  | RobotMassStorageDeviceAdded
  | RobotMassStorageDeviceEnumerated
  | RobotMassStorageDeviceRemoved
  | NotifySubscribeAction
  | NotifyUnsubscribeAction
