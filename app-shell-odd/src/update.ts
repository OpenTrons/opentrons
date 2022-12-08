// app updater
import { autoUpdater as updater } from 'electron-updater'

import { UI_INITIALIZED } from '@opentrons/app/src/redux/shell/actions'
import { createLogger } from './log'
import { getConfig } from './config'

import type { UpdateInfo } from '@opentrons/app/src/redux/shell/types'
import type { Action, Dispatch, PlainError } from './types'

updater.logger = createLogger('update')

updater.autoDownload = false

// LATEST_OT_SYSTEM_VERSION is instantiated in the preload file, and updated when
// an update is available in the onAvailable callback below
export const getLatestVersion = (): string => global.LATEST_OT_SYSTEM_VERSION

export function registerUpdate(
  dispatch: Dispatch
): (action: Action) => unknown {
  return function handleAction(action: Action) {
    switch (action.type) {
      case UI_INITIALIZED:
      case 'shell:CHECK_UPDATE':
        return checkUpdate(dispatch)
    }
  }
}

function checkUpdate(dispatch: Dispatch): void {
  const onAvailable = (info: UpdateInfo): void => {
    global.LATEST_OT_SYSTEM_VERSION= info.version
    done({ info, available: true })
  }
  const onNotAvailable = (info: UpdateInfo): void => {
    done({ info, available: false })
  }
  const onError = (error: Error): void => {
    done({ error: PlainObjectError(error) })
  }

  updater.once('update-available', onAvailable)
  updater.once('update-not-available', onNotAvailable)
  updater.once('error', onError)

  // @ts-expect-error(mc, 2021-02-16): do not use dot-path notation
  updater.channel = getConfig('update.channel')
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  updater.checkForUpdates()

  function done(payload: {
    info?: UpdateInfo
    available?: boolean
    error?: PlainError
  }): void {
    updater.removeListener('update-available', onAvailable)
    updater.removeListener('update-not-available', onNotAvailable)
    updater.removeListener('error', onError)
    dispatch({ type: 'shell:CHECK_UPDATE_RESULT', payload })
  }
}

// TODO(mc, 2018-03-29): this only exists to support RPC in a webworker;
//   remove when RPC is gone
function PlainObjectError(error: Error): PlainError {
  return { name: error.name, message: error.message }
}
