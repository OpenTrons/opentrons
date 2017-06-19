const electron = require('electron')
const {app, dialog} = electron
const {autoUpdater} = require('electron-updater')
const {getChannel, getSetting} = require('./preferences')
const {getLogger} = require('./logging.js')

autoUpdater.allowDowngrade = true


function isBetaApp() {
  return getChannel() === 'beta'
}

function setFeedURL(autoUpdater, channel) {
  autoUpdater.setFeedURL({
    provider: 's3',
    bucket: 'ot-app-builds',
    path: `channels/${channel}`,
    channel: channel
  })
}

function checkForUpdates(autoUpdater) {
  setFeedURL(autoUpdater, getChannel())
  autoUpdater.checkForUpdates()
}

function initAutoUpdater () {
  // Log whats happening
  const log = require('electron-log')
  log.transports.file.level = 'info'
  autoUpdater.logger = log

  const mainLogger = getLogger('electron-main')
  mainLogger.info('Initializing Audo Updater')

  autoUpdater.on(
    'error',
    (err) => mainLogger.info(`Update error: ${err.message}`)
  )

  autoUpdater.on(
    'checking-for-update',
    () => mainLogger.info('Checking for update')
  )

  autoUpdater.on(
    'update-available',
    () => mainLogger.info('Update available')
  )

  autoUpdater.on(
    'update-not-available',
    () => mainLogger.info('Update not available')
  )

  autoUpdater.on(
    'update-downloaded', (e, info) => {
      mainLogger.info(`Update downloaded: ${info}`)

      if (isBetaApp()) {
        // Do not automatically quit
        // setTimeout(() => autoUpdater.quitAndInstall(), 1);
        return
      }
      dialog.showMessageBox({
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'OT App', // TODO: Make this a config
        message: 'The new version has been downloaded. Please restart the application to apply the updates.',
        detail: ''  // info.releaseName + '\n\n' + info.releaseNotes
      }, response => {
        if (response === 0) {
          setTimeout(() => autoUpdater.quitAndInstall(), 1);
        }
      })
    }
  )

  autoUpdater.on('channel-changed', () => {
    mainLogger.info('[updater] channel changed event')
    setFeedURL(autoUpdater, getChannel())
    checkForUpdates(autoUpdater)
  })

  if (getSetting('autoUpdate') || isBetaApp()) {
    mainLogger.info('Auto updating is enabled, checking for updates')
    checkForUpdates(autoUpdater)
  } else {
    mainLogger.info('Auto updating disabled in settings, skipping checkForUpdates')
  }
}

module.exports = {
  initAutoUpdater
}
