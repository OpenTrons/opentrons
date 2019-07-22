// @flow
// buildroot update files
import path from 'path'
import { readFile, ensureDir } from 'fs-extra'
import { app } from 'electron'

import createLogger from '../log'
import { getConfig } from '../config'
import { CURRENT_VERSION } from '../update'
import { downloadManifest, getReleaseSet } from './release-manifest'
import { getReleaseFiles } from './release-files'
import { getPremigrationWheels, startPremigration } from './migrate'

import type { Action, Dispatch } from '../types'
import type { ReleaseSetFilepaths } from './types'
import type {
  BuildrootUpdateInfo,
  BuildrootAction,
} from '@opentrons/app/src/shell'

const log = createLogger(__filename)

const DIRECTORY = path.join(app.getPath('userData'), '__ot_buildroot__')

let updateSet: ReleaseSetFilepaths | null = null

export function registerBuildrootUpdate(dispatch: Dispatch) {
  const buildrootEnabled = Boolean(getConfig('devInternal')?.enableBuildRoot)
  log.debug('buildroot status', { enabled: buildrootEnabled })

  return function handleAction(action: Action) {
    if (buildrootEnabled) {
      switch (action.type) {
        case 'shell:CHECK_UPDATE':
          checkForBuildrootUpdate(dispatch)
          break

        case 'buildroot:START_PREMIGRATION': {
          const robot = action.payload

          dispatch({ type: 'buildroot:PREMIGRATION_STARTED' })
          getPremigrationWheels()
            .then(wheels => {
              log.info('Starting robot premigration', { robot, wheels })
              return startPremigration(robot, wheels.api, wheels.updateServer)
            })
            .then(
              (): BuildrootAction => ({
                type: 'buildroot:PREMIGRATION_DONE',
              })
            )
            .catch(
              (error: Error): BuildrootAction => ({
                type: 'buildroot:PREMIGRATION_ERROR',
                payload: error.message,
              })
            )
            .then(dispatch)

          break
        }
      }
    }
  }
}

// TODO(mc, 2019-07-01): send streaming upload from main process rather than
// sending this big file over to the UI thread. Remove this commented out
// function when we have that in place
// export function getUpdateFileContents(): Promise<Buffer> {
//   const systemFile = updateSet?.system

//   if (systemFile) {
//     return Promise.reject(new Error('No buildroot file present'))
//   }

//   return readFile(systemFile)
// }

// check for a buildroot update matching the current app version
//   1. Ensure the buildroot directory exists
//   2. Download the manifest file from S3
//   3. Get the release files according to the manifest
//      a. If the files need downloading, dispatch progress updates to UI
//   4. Cache the filepaths of the update files in memory
//   5. Dispatch info or error to UI
export function checkForBuildrootUpdate(dispatch: Dispatch): void {
  const manifestUrl = getConfig('buildroot').manifestUrl
  const fileDownloadDir = path.join(DIRECTORY, CURRENT_VERSION)

  ensureDir(fileDownloadDir)
    .then(() => downloadManifest(manifestUrl))
    .then(manifest => {
      const urls = getReleaseSet(manifest, CURRENT_VERSION)
      let prevPercentDone = 0

      if (!urls) {
        log.warn('No release files in manifest', {
          version: CURRENT_VERSION,
          manifest,
        })

        throw new Error(`No update files found for version ${CURRENT_VERSION}`)
      }

      const handleProgress = progress => {
        const { downloaded, size } = progress
        if (size !== null) {
          const percentDone = Math.round((downloaded / size) * 100)

          if (Math.abs(percentDone - prevPercentDone) > 0) {
            dispatch({
              type: 'buildroot:DOWNLOAD_PROGRESS',
              payload: percentDone,
            })
            prevPercentDone = percentDone
          }
        }
      }

      return getReleaseFiles(urls, fileDownloadDir, handleProgress)
    })
    .then(filepaths => cacheUpdateSet(filepaths))
    .then(updateInfo =>
      dispatch({ type: 'buildroot:UPDATE_INFO', payload: updateInfo })
    )
    .catch(error =>
      dispatch({ type: 'buildroot:DOWNLOAD_ERROR', payload: error.message })
    )
}

function cacheUpdateSet(
  filepaths: ReleaseSetFilepaths
): Promise<BuildrootUpdateInfo> {
  updateSet = filepaths

  return readFile(updateSet.releaseNotes, 'utf8').then(releaseNotes => ({
    version: CURRENT_VERSION,
    releaseNotes,
  }))
}
