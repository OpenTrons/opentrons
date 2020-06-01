// @flow
// app updater
import path from 'path'
import fs from 'fs'
import { autoUpdater as updater } from 'electron-updater'

import { createLogger } from './log'
import { getConfig } from './config'

import type { UpdateInfo } from '@opentrons/app/src/shell/types'
import type { Action, Dispatch, PlainError } from './types'

updater.logger = createLogger('update')
updater.autoDownload = false

export const CURRENT_VERSION: string = updater.currentVersion.version
export const CURRENT_RELEASE_NOTES: string = fs.readFileSync(
  // NOTE: __dirname refers to output directory
  path.join(__dirname, '../build/release-notes.md'),
  'utf8'
)

export function registerUpdate(dispatch: Dispatch): Action => mixed {
  return function handleAction(action: Action) {
    switch (action.type) {
      case 'shell:CHECK_UPDATE':
        return checkUpdate(dispatch)

      case 'shell:DOWNLOAD_UPDATE':
        return downloadUpdate(dispatch)

      case 'shell:APPLY_UPDATE':
        return updater.quitAndInstall()
    }
  }
}

function checkUpdate(dispatch: Dispatch) {
  const onAvailable = (info: UpdateInfo) => done({ info, available: true })
  const onNotAvailable = (info: UpdateInfo) => done({ info, available: false })
  const onError = (error: Error) => done({ error: PlainObjectError(error) })

  updater.once('update-available', onAvailable)
  updater.once('update-not-available', onNotAvailable)
  updater.once('error', onError)

  updater.channel = getConfig('update.channel')
  updater.checkForUpdates()

  function done(payload) {
    updater.removeListener('update-available', onAvailable)
    updater.removeListener('update-not-available', onNotAvailable)
    updater.removeListener('error', onError)
    dispatch({ type: 'shell:CHECK_UPDATE_RESULT', payload })
  }
}

function downloadUpdate(dispatch: Dispatch) {
  const onDownloaded = () => done({})
  const onError = (error: Error) => done({ error: PlainObjectError(error) })

  updater.once('update-downloaded', onDownloaded)
  updater.once('error', onError)
  updater.downloadUpdate()

  function done(payload) {
    updater.removeListener('update-downloaded', onDownloaded)
    updater.removeListener('error', onError)
    dispatch({ type: 'shell:DOWNLOAD_UPDATE_RESULT', payload })
  }
}

// TODO(mc, 2018-03-29): this only exists to support RPC in a webworker;
//   remove when RPC is gone
function PlainObjectError(error: Error): PlainError {
  return { name: error.name, message: error.message }
}
