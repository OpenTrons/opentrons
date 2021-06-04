// tests for the api client
import functions from 'lodash/functions'
import omit from 'lodash/omit'
import { push } from 'connected-react-router'
// @ts-expect-error(sa, 2021-05-17): api client is not typed yet
import { client } from '../api-client/client'
// @ts-expect-error(sa, 2021-05-17): rpc client is not typed yet
import { Client as RpcClient } from '../../../rpc/client'
import { actions, constants } from '../'
import * as AdminActions from '../../robot-admin/actions'

import {
  MockSession,
  MockSessionNoStateInfo,
  MockSessionNoDoorInfo,
} from './__fixtures__/session'
import { MockCalibrationManager } from './__fixtures__/calibration-manager'
import { mockConnectableRobot } from '../../discovery/__fixtures__'

import * as discoSelectors from '../../discovery/selectors'
import * as protocolSelectors from '../../protocol/selectors'
import * as customLwSelectors from '../../custom-labware/selectors'

import type { Dispatch } from 'redux'
import type { State, Action } from '../../types'

jest.mock('../../../rpc/client')
jest.mock('../../discovery/selectors')
jest.mock('../../protocol/selectors')
jest.mock('../../custom-labware/selectors')

const getLabwareDefBySlot = protocolSelectors.getLabwareDefBySlot as jest.MockedFunction<
  typeof protocolSelectors.getLabwareDefBySlot
>
const getCustomLabwareDefinitions = customLwSelectors.getCustomLabwareDefinitions as jest.MockedFunction<
  typeof customLwSelectors.getCustomLabwareDefinitions
>
const getConnectableRobots = discoSelectors.getConnectableRobots as jest.MockedFunction<
  typeof discoSelectors.getConnectableRobots
>

const delay = (ms: number): Promise<ReturnType<typeof setTimeout>> =>
  new Promise(resolve => setTimeout(resolve, ms))

describe('api client', () => {
  let dispatch: jest.MockedFunction<Dispatch>
  let sendToClient: (state: State, action: Action) => Promise<unknown>
  let rpcClient: any
  let session: any
  let sessionManager: any
  let calibrationManager: any

  let _global: { [key: string]: unknown } = {}
  beforeAll(() => {
    _global = { setInterval, clearInterval }

    global.setInterval = jest.fn()
    global.clearInterval = jest.fn()
  })

  afterAll(() => {
    Object.keys(_global).forEach(method => (global[method] = _global[method]))
  })

  beforeEach(() => {
    // TODO(mc, 2017-08-29): this is a pretty nasty mock. Probably a sign we
    // need to simplify the RPC client
    // mock robot, session, and session manager
    session = MockSession()
    calibrationManager = MockCalibrationManager()

    // mock rpc client
    sessionManager = {
      session,
      create: jest.fn(),
      create_from_bundle: jest.fn(),
    }
    rpcClient = {
      on: jest.fn(() => rpcClient),
      removeAllListeners: jest.fn(() => rpcClient),
      close: jest.fn(),
      remote: {
        session_manager: sessionManager,
        calibration_manager: calibrationManager,
      },
    }

    dispatch = jest.fn()
    RpcClient.mockResolvedValue(rpcClient)

    getLabwareDefBySlot.mockReturnValue({})
    getCustomLabwareDefinitions.mockReturnValue([])
    getConnectableRobots.mockReturnValue([mockConnectableRobot])

    const _receive = client(dispatch)

    sendToClient = (state, action) => {
      _receive(state, action)
      return delay(1)
    }
  })

  afterEach(() => {
    RpcClient.mockReset()
    jest.resetAllMocks()
  })

  const ROBOT_NAME = mockConnectableRobot.name
  const ROBOT_IP = mockConnectableRobot.ip
  const STATE: State = {
    robot: {
      connection: {
        connectedTo: '',
        connectRequest: { inProgress: false },
      },
    },
  } as any

  const sendConnect = (): Promise<unknown> =>
    sendToClient(STATE, actions.connect(ROBOT_NAME))

  const sendDisconnect = (): Promise<unknown> =>
    sendToClient(STATE, actions.disconnect())

  const sendNotification = (topic: any, payload: any): void => {
    expect(rpcClient.on).toHaveBeenCalledWith(
      'notification',
      expect.any(Function)
    )

    const handler = rpcClient.on.mock.calls.find((args: any) => {
      return args[0] === 'notification'
    })[1]

    // only send properties, not methods
    handler({ topic, payload: omit(payload, functions(payload)) })
  }

  describe('connect and disconnect', () => {
    it('connect RpcClient on CONNECT message', () => {
      const expectedResponse = actions.connectResponse(null, expect.any(Array))

      expect(RpcClient).toHaveBeenCalledTimes(0)

      return sendConnect().then(() => {
        expect(RpcClient).toHaveBeenCalledWith(`ws://${ROBOT_IP}:31950`)
        expect(dispatch).toHaveBeenCalledWith(expectedResponse)
      })
    })

    it('dispatch CONNECT_RESPONSE error if connection fails', () => {
      const error = new Error('AHH get_root')
      const expectedResponse = actions.connectResponse(error)

      RpcClient.mockRejectedValue(error)

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expectedResponse)
      )
    })

    it('send CONNECT_RESPONSE w/ capabilities from remote.session_manager', () => {
      const expectedResponse = actions.connectResponse(null, [
        'create',
        'create_from_bundle',
      ])

      rpcClient.monitoring = true

      return sendConnect().then(() => {
        expect(RpcClient).toHaveBeenCalledWith(`ws://${ROBOT_IP}:31950`)
        expect(dispatch).toHaveBeenCalledWith(expectedResponse)
      })
    })

    it('dispatch DISCONNECT_RESPONSE if already disconnected', () => {
      const expected = actions.disconnectResponse()

      return sendDisconnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('disconnects RPC client on DISCONNECT message', () => {
      const expected = actions.disconnectResponse()

      return sendConnect()
        .then(() => sendDisconnect())
        .then(() => expect(rpcClient.close).toHaveBeenCalled())
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('disconnects RPC client on robotAdmin:RESTART message', () => {
      const state: State = {
        ...STATE,
        robot: { ...STATE.robot, connection: { connectedTo: ROBOT_NAME } },
      } as any
      const expected = actions.disconnectResponse()

      return sendConnect()
        .then(() => sendToClient(state, AdminActions.restartRobot(ROBOT_NAME)))
        .then(() => expect(rpcClient.close).toHaveBeenCalled())
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    // TODO(mc, 2018-03-01): rethink / remove this behavior
    it('dispatch push to /run if connect to running session', () => {
      const expected = push('/run')
      session.state = constants.RUNNING

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('dispatch push to /run if connect to paused session', () => {
      const expected = push('/run')
      session.state = constants.PAUSED

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('will not try to connect multiple RpcClients at one time', () => {
      const state: State = {
        ...STATE,
        robot: {
          ...STATE.robot,
          connection: { connectRequest: { inProgress: true } },
        },
      } as any

      return sendToClient(state, actions.connect(ROBOT_NAME)).then(() => {
        expect(RpcClient).toHaveBeenCalledTimes(0)
      })
    })
  })

  describe('running', () => {
    it('calls session.run and dispatches RUN_RESPONSE success', () => {
      const expected = actions.runResponse()

      session.run.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient({} as any, actions.run()))
        .then(() => {
          expect(session.run).toHaveBeenCalled()
          expect(dispatch).toHaveBeenCalledWith(expected)
        })
    })

    it('calls session.run and dispatches RUN_RESPONSE failure', () => {
      const expected = actions.runResponse(new Error('AH'))

      session.run.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient({} as any, actions.run()))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('calls session.pause and dispatches PAUSE_RESPONSE success', () => {
      const expected = actions.pauseResponse()

      session.pause.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient({} as any, actions.pause()))
        .then(() => {
          expect(session.pause).toHaveBeenCalled()
          expect(dispatch).toHaveBeenCalledWith(expected)
        })
    })

    it('calls session.stop and dispatches PAUSE_RESPONSE failure', () => {
      const expected = actions.pauseResponse(new Error('AH'))

      session.pause.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient({} as any, actions.pause()))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('calls session.resume and dispatches RESUME_RESPONSE success', () => {
      const expected = actions.resumeResponse()

      session.resume.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient({} as any, actions.resume()))
        .then(() => {
          expect(session.resume).toHaveBeenCalled()
          expect(dispatch).toHaveBeenCalledWith(expected)
        })
    })

    it('calls session.resume and dispatches RESUME_RESPONSE failure', () => {
      const expected = actions.resumeResponse(new Error('AH'))

      session.resume.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient({} as any, actions.resume()))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('calls session.resume + stop and dispatches CANCEL_RESPONSE', () => {
      const expected = actions.cancelResponse()

      session.resume.mockResolvedValue()
      session.stop.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient({} as any, actions.cancel()))
        .then(() => {
          expect(session.resume).toHaveBeenCalled()
          expect(session.stop).toHaveBeenCalled()
          expect(dispatch).toHaveBeenCalledWith(expected)
        })
    })

    it('calls session.stop and dispatches CANCEL_RESPONSE failure', () => {
      const expected = actions.cancelResponse(new Error('AH'))

      session.resume.mockResolvedValue()
      session.stop.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient({} as any, actions.cancel()))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('calls session.refresh with REFRESH_SESSION', () => {
      session.refresh.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient({} as any, actions.refreshSession()))
        .then(() => expect(session.refresh).toHaveBeenCalled())
    })

    it('start a timer when the run starts', () => {
      session.run.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient({} as any, actions.run()))
        .then(() => expect(global.setInterval).toHaveBeenCalled())
    })
  })

  describe('session responses', () => {
    let expectedInitial: ReturnType<typeof actions.sessionResponse>

    beforeEach(() => {
      expectedInitial = actions.sessionResponse(
        null,
        {
          name: session.name,
          state: session.state,
          statusInfo: {
            message: null,
            userMessage: null,
            changedAt: null,
            estimatedDuration: null,
          },
          doorState: null,
          blocked: false,
          protocolText: session.protocol_text,
          protocolCommands: [],
          protocolCommandsById: {},
          pipettesByMount: {},
          labwareBySlot: {},
          modulesBySlot: {},
          apiLevel: [1, 0],
        },
        false
      )
    })

    it('dispatches sessionResponse on connect', () => {
      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expectedInitial)
      )
    })

    it('dispatches sessionResponse on full session notification', () => {
      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', session)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedInitial))
    })

    it('handles sessionResponses without status info', () => {
      session = MockSessionNoStateInfo()
      sessionManager.session = session
      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', session)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedInitial))
    })

    it('handles sessionResponses with some status info set', () => {
      session.stateInfo.changedAt = 2
      session.stateInfo.message = 'test message'
      const expected = actions.sessionResponse(
        null,
        {
          name: session.name,
          state: session.state,
          statusInfo: {
            message: 'test message',
            userMessage: null,
            changedAt: 2,
            estimatedDuration: null,
          },
          doorState: null,
          blocked: false,
          protocolText: session.protocol_text,
          protocolCommands: [],
          protocolCommandsById: {},
          pipettesByMount: {},
          labwareBySlot: {},
          modulesBySlot: {},
          apiLevel: [1, 0],
        },
        false
      )
      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', session)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('handles sessionResponses without door state and blocked info', () => {
      session = MockSessionNoDoorInfo()
      sessionManager.session = session
      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', session)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedInitial))
    })

    it('handles sessionResponses with door and blocked info', () => {
      session.blocked = true
      session.door_state = 'open'
      const expected = actions.sessionResponse(
        null,
        {
          name: session.name,
          state: session.state,
          statusInfo: {
            message: null,
            userMessage: null,
            changedAt: null,
            estimatedDuration: null,
          },
          doorState: 'open',
          blocked: true,
          protocolText: session.protocol_text,
          protocolCommands: [],
          protocolCommandsById: {},
          pipettesByMount: {},
          labwareBySlot: {},
          modulesBySlot: {},
          apiLevel: [1, 0],
        },
        false
      )
      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', session)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('handles connnect without session', () => {
      const notExpected = actions.sessionResponse(
        null,
        expect.anything(),
        false
      )

      sessionManager.session = null

      return sendConnect().then(() =>
        expect(dispatch).not.toHaveBeenCalledWith(notExpected)
      )
    })

    it('maps api session commands and command log to commands', () => {
      const expected = actions.sessionResponse(
        null,
        expect.objectContaining({
          protocolCommands: [0, 4],
          protocolCommandsById: {
            0: { id: 0, description: 'a', handledAt: 0, children: [1] },
            1: { id: 1, description: 'b', handledAt: 1, children: [2, 3] },
            2: { id: 2, description: 'c', handledAt: 2, children: [] },
            3: { id: 3, description: 'd', handledAt: null, children: [] },
            4: { id: 4, description: 'e', handledAt: null, children: [] },
          },
        }),
        false
      )

      session.commands = [
        {
          id: 0,
          description: 'a',
          children: [
            {
              id: 1,
              description: 'b',
              children: [
                { id: 2, description: 'c', children: [] },
                { id: 3, description: 'd', children: [] },
              ],
            },
          ],
        },
        { id: 4, description: 'e', children: [] },
      ]
      session.command_log = {
        0: 0,
        1: 1,
        2: 2,
      }

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('maps api instruments and instruments by mount', () => {
      const expected = actions.sessionResponse(
        null,
        expect.objectContaining({
          pipettesByMount: {
            left: {
              _id: 2,
              mount: 'left',
              name: 'p200',
              channels: 1,
              tipRacks: [4, 5],
              requestedAs: 'bar',
            },
            right: {
              _id: 1,
              mount: 'right',
              name: 'p50',
              channels: 8,
              tipRacks: [3, 4],
              requestedAs: 'foo',
            },
          },
        }),
        false
      )

      session.instruments = [
        {
          _id: 1,
          mount: 'right',
          name: 'p50',
          channels: 8,
          tip_racks: [{ _id: 3 }, { _id: 4 }],
          requested_as: 'foo',
        },
        {
          _id: 2,
          mount: 'left',
          name: 'p200',
          channels: 1,
          tip_racks: [{ _id: 4 }, { _id: 5 }],
          requested_as: 'bar',
        },
      ]

      session.containers = [{ _id: 3 }, { _id: 4 }, { _id: 5 }]

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('maps api containers to labware by slot', () => {
      const expected = actions.sessionResponse(
        null,
        expect.objectContaining({
          labwareBySlot: {
            1: {
              _id: 1,
              slot: '1',
              name: 'a',
              type: 'tiprack',
              isTiprack: true,
              calibratorMount: 'right',
              definitionHash: null,
            },
            5: {
              _id: 2,
              slot: '5',
              name: 'b',
              type: 'B',
              isTiprack: false,
              definitionHash: null,
            },
            9: {
              _id: 3,
              slot: '9',
              name: 'c',
              type: 'C',
              isTiprack: false,
              definitionHash: null,
            },
          },
        }),
        false
      )

      session.containers = [
        {
          _id: 1,
          slot: '1',
          name: 'a',
          type: 'tiprack',
          instruments: [
            { mount: 'left', channels: 8 },
            { mount: 'right', channels: 1 },
          ],
        },
        { _id: 2, slot: '5', name: 'b', type: 'B' },
        { _id: 3, slot: '9', name: 'c', type: 'C' },
      ]

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('reconciles reported tiprack / pipette usage', () => {
      const expected = actions.sessionResponse(
        null,
        expect.objectContaining({
          pipettesByMount: {
            left: {
              _id: 123,
              mount: 'left',
              name: 'p200',
              channels: 1,
              tipRacks: [789],
              requestedAs: 'bar',
            },
            right: {
              _id: 456,
              mount: 'right',
              name: 'p50',
              channels: 8,
              tipRacks: [789],
              requestedAs: 'foo',
            },
          },
          labwareBySlot: {
            1: {
              _id: 789,
              slot: '1',
              name: 'a',
              type: 'tiprack',
              isTiprack: true,
              calibratorMount: 'left',
              definitionHash: null,
            },
          },
        }),
        false
      )

      session.instruments = [
        {
          _id: 456,
          mount: 'right',
          name: 'p50',
          channels: 8,
          // guard against bogus tipracks in this array, which RPC API has been
          // observed doing as of 3.16
          tip_racks: [{ _id: 888 }],
          requested_as: 'foo',
        },
        {
          _id: 123,
          mount: 'left',
          name: 'p200',
          channels: 1,
          tip_racks: [{ _id: 999 }],
          requested_as: 'bar',
        },
      ]

      session.containers = [
        {
          _id: 789,
          slot: '1',
          name: 'a',
          type: 'tiprack',
          instruments: [
            { mount: 'left', channels: 1 },
            { mount: 'right', channels: 8 },
          ],
        },
      ]

      return sendConnect().then(() => {
        expect(dispatch).toHaveBeenCalledWith(expected)
      })
    })

    it('maps api modules to modules by slot', () => {
      const expected = actions.sessionResponse(
        null,
        expect.objectContaining({
          modulesBySlot: {
            1: {
              _id: 1,
              slot: '1',
              model: 'temperatureModuleV1',
              protocolLoadOrder: 0,
            },
            9: {
              _id: 9,
              slot: '9',
              model: 'magneticModuleV2',
              protocolLoadOrder: 1,
            },
          },
        }),
        false
      )

      session.modules = [
        {
          _id: 1,
          slot: '1',
          name: 'tempdeck',
        },
        {
          _id: 9,
          slot: '9',
          name: 'magdeck',
          model: 'magneticModuleV2',
        },
      ]

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('maps api metadata to session metadata', () => {
      const expected = actions.sessionResponse(
        null,
        expect.objectContaining({
          metadata: {
            'protocol-name': 'foo',
            description: 'bar',
            author: 'baz',
            source: 'qux',
          },
        }),
        false
      )

      session.metadata = {
        _id: 1234,
        some: () => {},
        rpc: () => {},
        cruft: () => {},
        protocolName: 'foo',
        description: 'bar',
        author: 'baz',
        source: 'qux',
      }

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('sends error if received malformed session from API', () => {
      const expected = actions.sessionResponse(expect.anything(), null, false)

      session.commands = [{ foo: 'bar' }]
      session.command_log = null

      return sendConnect().then(() =>
        expect(dispatch).toHaveBeenCalledWith(expected)
      )
    })

    it('sends SESSION_UPDATE if session notification has lastCommand', () => {
      const update = {
        state: 'running',
        startTime: 1,
        lastCommand: null,
        stateInfo: {},
        door_state: null,
        blocked: false,
      }

      const actionInput = {
        state: 'running',
        startTime: 1,
        lastCommand: null,
        statusInfo: {
          message: null,
          userMessage: null,
          changedAt: null,
          estimatedDuration: null,
        },
        doorState: null,
        blocked: false,
      } as any
      const expected = actions.sessionUpdate(actionInput, expect.any(Number))

      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', update)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('handles SESSION_UPDATEs with no stateInfo', () => {
      const update = {
        state: 'running',
        startTime: 2,
        lastCommand: null,
        door_state: 'closed',
        blocked: false,
      }

      const actionInput = {
        state: 'running',
        startTime: 2,
        lastCommand: null,
        doorState: 'closed',
        blocked: false,
        statusInfo: {
          message: null,
          userMessage: null,
          changedAt: null,
          estimatedDuration: null,
        },
      } as any
      const expected = actions.sessionUpdate(actionInput, expect.any(Number))

      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', update)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('handles SESSION_UPDATEs with values in stateInfo', () => {
      const update = {
        state: 'running',
        startTime: 2,
        lastCommand: null,
        blocked: false,
        door_state: 'closed',
        stateInfo: {
          message: 'hi and hello football fans',
          userMessage: 'whos ready for some FOOTBALL',
          changedAt: 2,
        },
      }

      const actionInput = {
        state: 'running',
        startTime: 2,
        lastCommand: null,
        blocked: false,
        doorState: 'closed',
        statusInfo: {
          message: 'hi and hello football fans',
          userMessage: 'whos ready for some FOOTBALL',
          changedAt: 2,
          estimatedDuration: null,
        },
      } as any
      const expected = actions.sessionUpdate(actionInput, expect.any(Number))

      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', update)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })

    it('handles SESSION_UPDATEs with no door or blocked info', () => {
      const update = {
        state: 'paused',
        startTime: 2,
        lastCommand: null,
        stateInfo: {},
      }

      const actionInput = {
        state: 'paused',
        startTime: 2,
        lastCommand: null,
        blocked: false,
        doorState: null,
        statusInfo: {
          message: null,
          userMessage: null,
          changedAt: null,
          estimatedDuration: null,
        },
      } as any
      const expected = actions.sessionUpdate(actionInput, expect.any(Number))

      return sendConnect()
        .then(() => {
          dispatch.mockClear()
          sendNotification('session', update)
        })
        .then(() => expect(dispatch).toHaveBeenCalledWith(expected))
    })
  })

  describe('calibration', () => {
    let state: State
    beforeEach(() => {
      state = {
        robot: {
          calibration: {
            calibrationRequest: {},
            confirmedBySlot: {},
            labwareBySlot: {},
          },
          session: {
            pipettesByMount: {
              left: { _id: 'inst-2' },
              right: { _id: 'inst-1' },
            },
            labwareBySlot: {
              1: { _id: 'lab-1', type: '96-flat' },
              5: {
                _id: 'lab-2',
                type: 'tiprack-200ul',
                isTiprack: true,
                calibratorMount: 'left',
              },
              9: {
                _id: 'lab-3',
                type: 'tiprack-200ul',
                isTiprack: true,
                calibratorMount: 'right',
              },
            },
          },
        },
      } as any
    })

    it('handles MOVE_TO_FRONT success', () => {
      const action = actions.moveToFront('left')
      const expectedResponse = actions.moveToFrontResponse()

      calibrationManager.move_to_front.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(calibrationManager.move_to_front).toHaveBeenCalledWith({
            _id: 'inst-2',
          })
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('handles MOVE_TO_FRONT failure', () => {
      const action = actions.moveToFront('left')
      const expectedResponse = actions.moveToFrontResponse(new Error('AH'))

      calibrationManager.move_to_front.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles PROBE_TIP success', () => {
      const action = actions.probeTip('right')
      const expectedResponse = actions.probeTipResponse()

      calibrationManager.tip_probe.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(calibrationManager.tip_probe).toHaveBeenCalledWith({
            _id: 'inst-1',
          })
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('handles PROBE_TIP failure', () => {
      const action = actions.probeTip('right')
      const expectedResponse = actions.probeTipResponse(new Error('AH'))

      calibrationManager.tip_probe.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles MOVE_TO success', () => {
      const action = actions.moveTo('left', '5')
      const expectedResponse = actions.moveToResponse()

      calibrationManager.move_to.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(calibrationManager.move_to).toHaveBeenCalledWith(
            { _id: 'inst-2' },
            { _id: 'lab-2' }
          )
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('handles MOVE_TO failure', () => {
      const action = actions.moveTo('left', '5')
      const expectedResponse = actions.moveToResponse(new Error('AH'))

      calibrationManager.move_to.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles PICKUP_AND_HOME success', () => {
      const action = actions.pickupAndHome('left', '5')
      const expectedResponse = actions.pickupAndHomeResponse()

      calibrationManager.update_container_offset.mockResolvedValue()
      calibrationManager.pick_up_tip.mockResolvedValue()
      calibrationManager.home.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(calibrationManager.pick_up_tip).toHaveBeenCalledWith(
            { _id: 'inst-2' },
            { _id: 'lab-2' }
          )
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('handles PICKUP_AND_HOME failure update offset', () => {
      const action = actions.pickupAndHome('left', '5')
      const expectedResponse = actions.pickupAndHomeResponse(new Error('AH'))

      calibrationManager.update_container_offset.mockRejectedValue(
        new Error('AH')
      )

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles PICKUP_AND_HOME failure during pickup', () => {
      const action = actions.pickupAndHome('left', '5')
      const expectedResponse = actions.pickupAndHomeResponse(new Error('AH'))

      calibrationManager.update_container_offset.mockResolvedValue()
      calibrationManager.pick_up_tip.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles DROP_TIP_AND_HOME success', () => {
      const action = actions.dropTipAndHome('right', '9')
      const expectedResponse = actions.dropTipAndHomeResponse()

      calibrationManager.drop_tip.mockResolvedValue()
      calibrationManager.home.mockResolvedValue()
      calibrationManager.move_to.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(calibrationManager.drop_tip).toHaveBeenCalledWith(
            { _id: 'inst-1' },
            { _id: 'lab-3' }
          )
          expect(calibrationManager.home).toHaveBeenCalledWith({
            _id: 'inst-1',
          })
          expect(calibrationManager.move_to).toHaveBeenCalledWith(
            { _id: 'inst-1' },
            { _id: 'lab-3' }
          )
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('handles DROP_TIP_AND_HOME failure in drop_tip', () => {
      const action = actions.dropTipAndHome('right', '9')
      const expectedResponse = actions.dropTipAndHomeResponse(new Error('AH'))

      calibrationManager.drop_tip.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles DROP_TIP_AND_HOME failure in home', () => {
      const action = actions.dropTipAndHome('right', '9')
      const expectedResponse = actions.dropTipAndHomeResponse(new Error('AH'))

      calibrationManager.drop_tip.mockResolvedValue()
      calibrationManager.home.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles DROP_TIP_AND_HOME failure in move_to', () => {
      const action = actions.dropTipAndHome('right', '9')
      const expectedResponse = actions.dropTipAndHomeResponse(new Error('AH'))

      calibrationManager.drop_tip.mockResolvedValue()
      calibrationManager.home.mockResolvedValue()
      calibrationManager.move_to.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('CONFIRM_TIPRACK drops tip if not last tiprack', () => {
      const action = actions.confirmTiprack('left', '9')
      const expectedResponse = actions.confirmTiprackResponse()

      calibrationManager.drop_tip.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(calibrationManager.drop_tip).toHaveBeenCalledWith(
            { _id: 'inst-2' },
            { _id: 'lab-3' }
          )
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('CONFIRM_TIPRACK noops and keeps tip if last tiprack', () => {
      state.robot.calibration.confirmedBySlot[5] = true

      const action = actions.confirmTiprack('left', '9')
      const expectedResponse = actions.confirmTiprackResponse(null, true)

      calibrationManager.drop_tip.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(calibrationManager.drop_tip).not.toHaveBeenCalled()
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('handles CONFIRM_TIPRACK drop tip failure', () => {
      const action = actions.confirmTiprack('left', '9')
      const expectedResponse = actions.confirmTiprackResponse(new Error('AH'))

      calibrationManager.drop_tip.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles JOG success', () => {
      const action = actions.jog('left', 'y', -1, 10)
      const expectedResponse = actions.jogResponse()

      calibrationManager.jog.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(calibrationManager.jog).toHaveBeenCalledWith(
            { _id: 'inst-2' },
            -10,
            'y'
          )
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('handles JOG failure', () => {
      const action = actions.jog('left', 'x', 1, 10)
      const expectedResponse = actions.jogResponse(new Error('AH'))

      calibrationManager.jog.mockRejectedValue(new Error('AH'))

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })

    it('handles UPDATE_OFFSET success', () => {
      const action = actions.updateOffset('left', 1 as any)
      // @ts-expect-error actions.updateOffsetResponse only takes one arg but we're giving two here
      const expectedResponse = actions.updateOffsetResponse(null, false)

      calibrationManager.update_container_offset.mockResolvedValue()

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => {
          expect(
            calibrationManager.update_container_offset
          ).toHaveBeenCalledWith({ _id: 'lab-1' }, { _id: 'inst-2' })
          expect(dispatch).toHaveBeenCalledWith(expectedResponse)
        })
    })

    it('handles UPDATE_OFFSET failure', () => {
      const action = actions.updateOffset('left', 9 as any)
      const expectedResponse = actions.updateOffsetResponse(new Error('AH'))

      calibrationManager.update_container_offset.mockRejectedValue(
        new Error('AH')
      )

      return sendConnect()
        .then(() => sendToClient(state, action))
        .then(() => expect(dispatch).toHaveBeenCalledWith(expectedResponse))
    })
  })
})
