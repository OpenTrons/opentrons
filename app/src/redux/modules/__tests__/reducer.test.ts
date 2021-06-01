import * as Fixtures from '../__fixtures__'
import { modulesReducer } from '../reducer'

import type { Action } from '../../types'
import type { ModulesState } from '../types'

interface ReducerSpec {
  name: string
  state: ModulesState
  action: Action
  expected: ModulesState
}

const SPECS: ReducerSpec[] = [
  {
    name: 'handles modules:FETCH_MODULES_SUCCESS',
    action: {
      type: 'modules:FETCH_MODULES_SUCCESS',
      payload: {
        robotName: 'robotName',
        modules: [Fixtures.mockTemperatureModule],
      },
      meta: {} as any,
    },
    state: {
      robotName: {
        modulesById: null,
      },
    },
    expected: {
      robotName: {
        modulesById: {
          [Fixtures.mockTemperatureModule.serial]:
            Fixtures.mockTemperatureModule,
        },
      },
    },
  },
]

describe('modulesReducer', () => {
  SPECS.forEach(spec => {
    const { name, state, action, expected } = spec
    it(name, () => expect(modulesReducer(state, action)).toEqual(expected))
  })
})
