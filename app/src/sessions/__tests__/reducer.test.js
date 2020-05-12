// @flow
import * as Fixtures from '../__fixtures__'
import { robotSessionReducer } from '../reducer'

import type { Action } from '../../types'
import type { SessionState } from '../types'

type ReducerSpec = {|
  name: string,
  state: SessionState,
  action: Action,
  expected: SessionState,
|}

const SPECS: Array<ReducerSpec> = [
  {
    name: 'handles sessions:CREATE_ROBOT_SESSION_SUCCESS',
    action: {
      type: 'sessions:CREATE_ROBOT_SESSION_SUCCESS',
      payload: {
        robotName: 'eggplant-parm',
        ...Fixtures.mockRobotSessionData,
      },
      meta: {},
    },
    state: {
      'eggplant-parm': {
        'robotSessions': {}
      }
    },
    expected: {
      'eggplant-parm': {
        'robotSessions': {
          '1234': Fixtures.mockRobotSessionData,
        },
      },
    },
  },
  {
    name: 'handles sessions:CREATE_ROBOT_SESSION_SUCCESS with existing',
    action: {
      type: 'sessions:CREATE_ROBOT_SESSION_SUCCESS',
      payload: {
        robotName: 'eggplant-parm',
        ...Fixtures.mockRobotSessionData,
      },
      meta: {},
    },
    state: {
      'eggplant-parm': {
        'robotSessions': {
          '4321': Fixtures.mockRobotSessionData,
        }
      }
    },
    expected: {
      'eggplant-parm': {
        'robotSessions': {
          '4321': Fixtures.mockRobotSessionData,
          '1234': Fixtures.mockRobotSessionData,
        },
      },
    },
  },
  {
    name: 'handles sessions:FETCH_ROBOT_SESSION_SUCCESS',
    action: {
      type: 'sessions:FETCH_ROBOT_SESSION_SUCCESS',
      payload: {
        robotName: 'eggplant-parm',
        ...Fixtures.mockRobotSessionData,
      },
      meta: {},
    },
    state: {
      'eggplant-parm': {
      }
    },
    expected: {
      'eggplant-parm': {
        'robotSessions': {
          '1234': Fixtures.mockRobotSessionData,
        },
      },
    },
  },
  {
    name: 'handles sessions:FETCH_ROBOT_SESSION_SUCCESS with existing',
    action: {
      type: 'sessions:FETCH_ROBOT_SESSION_SUCCESS',
      payload: {
        robotName: 'eggplant-parm',
        ...Fixtures.mockRobotSessionData,
      },
      meta: {},
    },
    state: {
      'eggplant-parm': {
        'robotSessions': {
          '4321': Fixtures.mockRobotSessionData,
        },
      },
    },
    expected: {
      'eggplant-parm': {
        'robotSessions': {
          '1234': Fixtures.mockRobotSessionData,
          '4321': Fixtures.mockRobotSessionData,
        },
      },
    },
  },
  {
    name: 'handles sessions:UPDATE_ROBOT_SESSION_SUCCESS',
    action: {
      type: 'sessions:UPDATE_ROBOT_SESSION_SUCCESS',
      payload: {
        robotName: 'eggplant-parm',
        ...Fixtures.mockRobotSessionUpdateData,
      },
      meta: {},
    },
    state: {
      'eggplant-parm': {
        'robotSessions': {
          '1234': Fixtures.mockRobotSessionData,
        },
      },
    },
    expected: {
      'eggplant-parm': {
        'robotSessions': {
          '1234': {
            ...Fixtures.mockRobotSessionUpdateData.meta,
          },
        },
      },
    },
  },
  {
    name: 'handles sessions:UPDATE_ROBOT_SESSION_SUCCESS with existing',
    action: {
      type: 'sessions:UPDATE_ROBOT_SESSION_SUCCESS',
      payload: {
        robotName: 'eggplant-parm',
        ...Fixtures.mockRobotSessionUpdateData,
      },
      meta: {},
    },
    state: {
      'eggplant-parm': {
        'robotSessions': {
          '4321': Fixtures.mockRobotSessionData,
          '1234': Fixtures.mockRobotSessionData,
        },
      },
    },
    expected: {
      'eggplant-parm': {
        'robotSessions': {
          '4321': Fixtures.mockRobotSessionData,
          '1234': {
            ...Fixtures.mockRobotSessionUpdateData.meta,
          },
        },
      },
    },
  },
  {
    name: 'handles sessions:DELETE_ROBOT_SESSION_SUCCESS',
    action: {
      type: 'sessions:DELETE_ROBOT_SESSION_SUCCESS',
      payload: {
        robotName: 'eggplant-parm',
        ...Fixtures.mockRobotSessionData,
      },
      meta: {},
    },
    state: {
      'eggplant-parm': {
        'robotSessions': {
          '4321': Fixtures.mockRobotSessionData,
          '1234': Fixtures.mockRobotSessionData,
        },
      },
    },
    expected: {
      'eggplant-parm': {
        'robotSessions': {
          '4321': Fixtures.mockRobotSessionData,
          '1234': null,
        },
      },
    },
  },
]

describe('robotSessionReducer', () => {
  SPECS.forEach(spec => {
    const { name, state, action, expected } = spec
    it(name, () => expect(robotSessionReducer(state, action)).toEqual(expected))
  })
})
