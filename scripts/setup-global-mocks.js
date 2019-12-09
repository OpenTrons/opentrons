'use strict'

jest.mock('electron')
jest.mock('electron-updater')
jest.mock('electron-store')

jest.mock('../components/src/deck/getDeckDefinitions')
jest.mock('../app/src/getLabware')
jest.mock('../app/src/logger')
jest.mock('../app/src/shell/remote')
jest.mock('../app-shell/src/config')
jest.mock('../app-shell/src/log')
jest.mock('../protocol-designer/src/labware-defs/utils.js')
