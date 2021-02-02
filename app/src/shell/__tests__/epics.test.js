// @flow
// tests for the shell module
import { EMPTY } from 'rxjs'
import { TestScheduler } from 'rxjs/testing'
import { take } from 'rxjs/operators'

import * as Alerts from '../../alerts'
import * as Config from '../../config'
import * as ShellUpdate from '../update'
import { remote as mockRemote } from '../remote'
import { shellEpic } from '../epic'

import type { State } from '../../types'
import type { UpdateChannel } from '../../config/types'

const { ipcRenderer: mockIpc } = mockRemote

jest.mock('../../config')

// TODO(mc, 2020-10-08): this is a partial mock because shell/update
// needs some reorg to split actions and selectors
jest.mock('../update', () => ({
  ...jest.requireActual('../update'),
  getAvailableShellUpdate: jest.fn(),
}))

const getUpdateChannel: JestMockFn<[State], UpdateChannel> =
  Config.getUpdateChannel

const getAvailableShellUpdate: JestMockFn<[State], string | null> =
  ShellUpdate.getAvailableShellUpdate

describe('shell epics', () => {
  let testScheduler

  beforeEach(() => {
    testScheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected)
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('"dispatches" actions to IPC if meta.shell', () => {
    const shellAction = { type: 'foo', meta: { shell: true } }

    testScheduler.run(({ hot, expectObservable }) => {
      const action$ = hot('-a', { a: shellAction })
      const output$ = shellEpic(action$, EMPTY)

      expectObservable(output$).toBe('--')
    })

    // NOTE: this expectation has to outside the testScheduler scope or else
    // everything breaks for some reason
    expect(mockIpc.send).toHaveBeenCalledWith('dispatch', shellAction)
  })

  // due to the use of `fromEvent`, this test doesn't work well as a marble
  // test. `toPromise` based expectation should be sufficient
  it('catches actions from main', () => {
    const shellAction = { type: 'bar' }
    const result = shellEpic(EMPTY, EMPTY).pipe(take(1)).toPromise()

    ;(mockIpc: any).emit('dispatch', {}, shellAction)

    return expect(result).resolves.toEqual(shellAction)
  })

  it('triggers an appUpdateAvailable alert if an app update becomes available', () => {
    const mockState: State = ({ mockState: true }: any)

    getAvailableShellUpdate.mockReturnValueOnce(null)
    getAvailableShellUpdate.mockReturnValue('1.2.3')

    testScheduler.run(({ hot, expectObservable }) => {
      const action$ = hot('----')
      const state$ = hot('-a-a-a', { a: mockState })
      const output$ = shellEpic(action$, state$)

      // we only expect the alert to be triggered when state goes from null
      // to an update version
      expectObservable(output$).toBe('---a--', {
        a: Alerts.alertTriggered(Alerts.ALERT_APP_UPDATE_AVAILABLE),
      })
    })
  })

  it('should trigger a shell:CHECK_UPDATE action if the update channel changes', () => {
    const mockState: State = ({ mockState: true }: any)

    getUpdateChannel.mockReturnValueOnce('latest')
    getUpdateChannel.mockReturnValue('beta')

    testScheduler.run(({ hot, expectObservable }) => {
      const action$ = hot('------')
      const state$ = hot('-a-a-a', { a: mockState })
      const output$ = shellEpic(action$, state$)

      // we only expect the alert to be triggered when state changes
      expectObservable(output$).toBe('---a--', {
        a: ShellUpdate.checkShellUpdate(),
      })
    })
  })
})
