// sets up a mock global available to all tests
'use strict'

const mockElectron = require('./electron')

// TODO: BC 2019-05-06 relocate this appropriately

global.APP_SHELL = {
  __mockElectron: mockElectron,
  ipcRenderer: mockElectron.ipcRenderer,
  apiUpdate: mockElectron.remote.require('./api-update'),
  config: mockElectron.remote.require('./config'),
  discovery: mockElectron.remote.require('./discovery'),
  update: mockElectron.remote.require('./update'),
  buildroot: mockElectron.remote.require('./buildroot'),
}
