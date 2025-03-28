import { beforeEach, describe, it, expect } from 'vitest'
import merge from 'lodash/merge'
import {
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
} from '@opentrons/shared-data'
import {
  forHeaterShakerSetTargetTemperature as _forHeaterShakerSetTargetTemperature,
  forHeaterShakerAwaitTemperature as _forHeaterShakerAwaitTemperature,
  forHeaterShakerDeactivateHeater as _forHeaterShakerDeactivateHeater,
  forHeaterShakerSetTargetShakeSpeed as _forHeaterShakerSetTargetShakeSpeed,
  forHeaterShakerStopShake as _forHeaterShakerStopShake,
  forHeaterShakerOpenLatch as _forHeaterShakerOpenLatch,
  forHeaterShakerCloseLatch as _forHeaterShakerCloseLatch,
} from '../getNextRobotStateAndWarnings/heaterShakerUpdates'
import { makeImmutableStateUpdater } from '../__utils__'
import { makeContext, getInitialRobotStateStandard } from '../fixtures'
import type {
  HeaterShakerModuleState,
  InvariantContext,
  RobotState,
} from '../types'
import type { ImmutableStateUpdater } from '../__utils__'
import type {
  TemperatureParams,
  ModuleOnlyParams,
  ShakeSpeedParams,
} from '@opentrons/shared-data/protocol/types/schemaV6/command/module'

const forHeaterShakerSetTargetTemperature = makeImmutableStateUpdater(
  _forHeaterShakerSetTargetTemperature
)
const forHeaterShakerAwaitTemperature = makeImmutableStateUpdater(
  _forHeaterShakerAwaitTemperature
)

const forHeaterShakerDeactivateHeater = makeImmutableStateUpdater(
  _forHeaterShakerDeactivateHeater
)

const forHeaterShakerSetTargetShakeSpeed = makeImmutableStateUpdater(
  _forHeaterShakerSetTargetShakeSpeed
)

const forHeaterShakerStopShake = makeImmutableStateUpdater(
  _forHeaterShakerStopShake
)

const forHeaterShakerOpenLatch = makeImmutableStateUpdater(
  _forHeaterShakerOpenLatch
)

const forHeaterShakerCloseLatch = makeImmutableStateUpdater(
  _forHeaterShakerCloseLatch
)
const moduleId = 'heaterShakerModuleId'
let invariantContext: InvariantContext
let startRobotState: RobotState
beforeEach(() => {
  invariantContext = makeContext()
  invariantContext.moduleEntities[moduleId] = {
    id: moduleId,
    type: HEATERSHAKER_MODULE_TYPE,
    model: HEATERSHAKER_MODULE_V1,
    pythonName: 'mockPythonName',
  }
  startRobotState = getInitialRobotStateStandard(invariantContext)
  startRobotState.modules[moduleId] = {
    slot: '6',
    moduleState: {
      type: HEATERSHAKER_MODULE_TYPE,
      targetTemp: 50,
      targetSpeed: 400,
      latchOpen: true,
    },
  }
})
interface TestCase<P> {
  params: P
  expectedUpdate: Partial<HeaterShakerModuleState>
  moduleStateBefore: Partial<HeaterShakerModuleState>
  fn: ImmutableStateUpdater<P>
  testName: string
}

type TestCases<P> = Array<TestCase<P>>
describe('heater shaker state updaters', () => {
  const temperatureParamsCases: TestCases<TemperatureParams> = [
    {
      params: {
        moduleId: moduleId,
        celsius: 50,
      },
      moduleStateBefore: {
        targetTemp: null,
      },
      expectedUpdate: {
        targetTemp: 50,
      },
      fn: forHeaterShakerSetTargetTemperature,
      testName:
        'forHeaterShakerSetTargetTemperature should update the temperature',
    },
  ]

  const moduleOnlyParamsCases: TestCases<ModuleOnlyParams> = [
    {
      params: {
        moduleId: moduleId,
      },
      moduleStateBefore: {
        targetTemp: 50,
      },
      expectedUpdate: {
        targetTemp: null,
      },
      fn: forHeaterShakerDeactivateHeater,
      testName:
        'forHeaterShakerDeactivateHeater should deactivate the temperature',
    },
    {
      params: {
        moduleId: moduleId,
      },
      moduleStateBefore: {
        targetTemp: 50,
      },
      expectedUpdate: {
        targetTemp: 50,
      },
      fn: forHeaterShakerAwaitTemperature,
      testName: 'forHeaterShakerAwaitTemperature should wait temperature',
    },
    {
      params: {
        moduleId: moduleId,
      },
      moduleStateBefore: {
        targetSpeed: 500,
      },
      expectedUpdate: {
        targetSpeed: null,
      },
      fn: forHeaterShakerStopShake,
      testName: 'forHeaterShakerAwaitTemperature should wait temperature',
    },
    {
      params: {
        moduleId: moduleId,
      },
      moduleStateBefore: {
        latchOpen: false,
      },
      expectedUpdate: {
        latchOpen: true,
      },
      fn: forHeaterShakerOpenLatch,
      testName: 'forHeaterShakerOpenLatch should open latch',
    },
    {
      params: {
        moduleId: moduleId,
      },
      moduleStateBefore: {
        latchOpen: true,
      },
      expectedUpdate: {
        latchOpen: false,
      },
      fn: forHeaterShakerCloseLatch,
      testName: 'forHeaterShakerCloseLatch should close latch',
    },
  ]
  const shakeSpeedParamsCases: TestCases<ShakeSpeedParams> = [
    {
      params: {
        moduleId: moduleId,
        rpm: 400,
      },
      moduleStateBefore: {
        targetSpeed: null,
      },
      expectedUpdate: {
        targetSpeed: 400,
      },
      fn: forHeaterShakerSetTargetShakeSpeed,
      testName: 'forHeaterShakerSetTargetShakeSpeed should set target speed',
    },
  ]

  const runTest = <P>({
    params,
    moduleStateBefore,
    expectedUpdate,
    fn,
    testName,
  }: TestCase<P>): void => {
    it(testName, () => {
      const prevRobotState = merge({}, startRobotState, {
        modules: {
          [moduleId]: {
            moduleState: moduleStateBefore,
          },
        },
      })
      const result = fn(params, invariantContext, prevRobotState)
      expect(result).toMatchObject({
        robotState: {
          modules: {
            [moduleId]: {
              slot: '6',
              moduleState: {
                ...startRobotState.modules[moduleId].moduleState,
                ...expectedUpdate,
              },
            },
          },
        },
        warnings: [],
      })
    })
  }

  moduleOnlyParamsCases.forEach(runTest)
  temperatureParamsCases.forEach(runTest)
  shakeSpeedParamsCases.forEach(runTest)
})
