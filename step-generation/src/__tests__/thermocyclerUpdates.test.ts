import { beforeEach, describe, it, expect } from 'vitest'
import merge from 'lodash/merge'
import {
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V1,
} from '@opentrons/shared-data'
import {
  forThermocyclerSetTargetBlockTemperature as _forThermocyclerSetTargetBlockTemperature,
  forThermocyclerSetTargetLidTemperature as _forThermocyclerSetTargetLidTemperature,
  forThermocyclerAwaitBlockTemperature as _forThermocyclerAwaitBlockTemperature,
  forThermocyclerAwaitLidTemperature as _forThermocyclerAwaitLidTemperature,
  forThermocyclerDeactivateBlock as _forThermocyclerDeactivateBlock,
  forThermocyclerDeactivateLid as _forThermocyclerDeactivateLid,
  forThermocyclerRunProfile as _forThermocyclerRunProfile,
  forThermocyclerCloseLid as _forThermocyclerCloseLid,
  forThermocyclerOpenLid as _forThermocyclerOpenLid,
} from '../getNextRobotStateAndWarnings/thermocyclerUpdates'
import type { ImmutableStateUpdater } from '../__utils__'
import { makeImmutableStateUpdater } from '../__utils__'
import { makeContext, getInitialRobotStateStandard } from '../fixtures'
import type {
  ModuleOnlyParams,
  TemperatureParams,
  ThermocyclerSetTargetBlockTemperatureParams,
} from '@opentrons/shared-data/protocol/types/schemaV6/command/module'
import type {
  InvariantContext,
  RobotState,
  ThermocyclerModuleState,
} from '../types'

const forThermocyclerSetTargetBlockTemperature = makeImmutableStateUpdater(
  _forThermocyclerSetTargetBlockTemperature
)
const forThermocyclerSetTargetLidTemperature = makeImmutableStateUpdater(
  _forThermocyclerSetTargetLidTemperature
)
const forThermocyclerAwaitBlockTemperature = makeImmutableStateUpdater(
  _forThermocyclerAwaitBlockTemperature
)
const forThermocyclerAwaitLidTemperature = makeImmutableStateUpdater(
  _forThermocyclerAwaitLidTemperature
)
const forThermocyclerDeactivateBlock = makeImmutableStateUpdater(
  _forThermocyclerDeactivateBlock
)
const forThermocyclerDeactivateLid = makeImmutableStateUpdater(
  _forThermocyclerDeactivateLid
)
const forThermocyclerCloseLid = makeImmutableStateUpdater(
  _forThermocyclerCloseLid
)
const forThermocyclerOpenLid = makeImmutableStateUpdater(
  _forThermocyclerOpenLid
)
const forThermocyclerRunProfile = makeImmutableStateUpdater(
  _forThermocyclerRunProfile
)
const moduleId = 'thermocyclerModuleId'
let invariantContext: InvariantContext
let lidOpenRobotState: RobotState
beforeEach(() => {
  invariantContext = makeContext()
  invariantContext.moduleEntities[moduleId] = {
    id: moduleId,
    type: THERMOCYCLER_MODULE_TYPE,
    model: THERMOCYCLER_MODULE_V1,
    pythonName: 'mockPythonName',
  }
  lidOpenRobotState = getInitialRobotStateStandard(invariantContext)
  lidOpenRobotState.modules[moduleId] = {
    slot: 'span7_8_10_11',
    moduleState: {
      type: THERMOCYCLER_MODULE_TYPE,
      lidOpen: true,
      lidTargetTemp: null,
      blockTargetTemp: null,
    },
  }
})
interface TestCase<P> {
  params: P
  expectedUpdate: Partial<ThermocyclerModuleState>
  moduleStateBefore: Partial<ThermocyclerModuleState>
  fn: ImmutableStateUpdater<P>
  testName: string
}
type TestCases<P> = Array<TestCase<P>>
describe('thermocycler state updaters', () => {
  const blockTempTestCase: TestCases<ThermocyclerSetTargetBlockTemperatureParams> = [
    {
      params: {
        moduleId,
        celsius: 42,
      },
      moduleStateBefore: {
        blockTargetTemp: null,
      },
      expectedUpdate: {
        blockTargetTemp: 42,
      },
      fn: forThermocyclerSetTargetBlockTemperature,
      testName:
        'forThermocyclerSetBlockTemperature should update the block temp',
    },
  ]
  const temperatureParamsCases: TestCases<TemperatureParams> = [
    {
      params: {
        moduleId,
        celsius: 42,
      },
      moduleStateBefore: {
        lidTargetTemp: null,
      },
      expectedUpdate: {
        lidTargetTemp: 42,
      },
      fn: forThermocyclerSetTargetLidTemperature,
      testName:
        'forThermocyclerSetTargetLidTemperature should update the lid temp',
    },
    {
      params: {
        moduleId,
        celsius: 42,
      },
      moduleStateBefore: {
        lidTargetTemp: 41,
        blockTargetTemp: 42,
        lidOpen: true,
      },
      expectedUpdate: {
        lidTargetTemp: 41,
        blockTargetTemp: 42,
        lidOpen: true,
      },
      fn: forThermocyclerAwaitBlockTemperature,
      testName: 'forThermocyclerAwaitBlockTemperature should do nothing',
    },
    {
      params: {
        moduleId,
        celsius: 41,
      },
      moduleStateBefore: {
        lidTargetTemp: 41,
        blockTargetTemp: 42,
        lidOpen: true,
      },
      expectedUpdate: {
        lidTargetTemp: 41,
        blockTargetTemp: 42,
        lidOpen: true,
      },
      fn: forThermocyclerAwaitLidTemperature,
      testName: 'forThermocyclerAwaitLidTemperature should do nothing',
    },
  ]
  const moduleOnlyParamsCases: TestCases<ModuleOnlyParams> = [
    {
      params: {
        moduleId,
      },
      moduleStateBefore: {
        blockTargetTemp: 42,
      },
      expectedUpdate: {
        blockTargetTemp: null,
      },
      fn: forThermocyclerDeactivateBlock,
      testName:
        'forThermocyclerDeactivateBlock should set blockTargetTemp to null',
    },
    {
      params: {
        moduleId,
      },
      moduleStateBefore: {
        lidTargetTemp: 42,
      },
      expectedUpdate: {
        lidTargetTemp: null,
      },
      fn: forThermocyclerDeactivateLid,
      testName: 'forThermocyclerDeactivateLid should set lidTargetTemp to null',
    },
    {
      params: {
        moduleId,
      },
      moduleStateBefore: {
        lidOpen: true,
      },
      expectedUpdate: {
        lidOpen: false,
      },
      fn: forThermocyclerCloseLid,
      testName: 'forThermocyclerCloseLid should set lidOpen to false',
    },
    {
      params: {
        moduleId,
      },
      moduleStateBefore: {
        lidOpen: false,
      },
      expectedUpdate: {
        lidOpen: true,
      },
      fn: forThermocyclerOpenLid,
      testName: 'forThermocyclerOpenLid should set lidOpen to true',
    },
  ]
  const profileCases: TestCases<any> = [
    {
      params: {
        moduleId,
        profile: [],
        volume: 10,
      },
      moduleStateBefore: {},
      expectedUpdate: {},
      fn: forThermocyclerRunProfile,
      testName: 'forThermocyclerRunProfile should not make any updates',
    },
    {
      params: {
        moduleId,
        profile: [
          {
            holdTime: 10,
            temperature: 50,
          },
          {
            holdTime: 10,
            temperature: 30,
          },
          {
            holdTime: 10,
            temperature: 0,
          },
        ],
        volume: 10,
      },
      moduleStateBefore: {
        blockTargetTemp: 42,
      },
      expectedUpdate: {
        blockTargetTemp: 0,
      },
      fn: forThermocyclerRunProfile,
      testName: 'forThermocyclerRunProfile should set blockTargetTemp to 0',
    },
    {
      params: {
        moduleId,
        profile: [
          {
            holdTime: 10,
            temperature: 0,
          },
          {
            holdTime: 10,
            temperature: 50,
          },
          {
            holdTime: 10,
            temperature: 20,
          },
        ],
        volume: 10,
      },
      moduleStateBefore: {
        blockTargetTemp: 42,
      },
      expectedUpdate: {
        blockTargetTemp: 20,
      },
      fn: forThermocyclerRunProfile,
      testName: 'forThermocyclerRunProfile should set blockTargetTemp to 20',
    },
    {
      params: {
        moduleId,
        profile: [
          {
            holdTime: 10,
            temperature: 30,
          },
        ],
        volume: 10,
      },
      moduleStateBefore: {
        blockTargetTemp: 42,
      },
      expectedUpdate: {
        blockTargetTemp: 30,
      },
      fn: forThermocyclerRunProfile,
      testName: 'forThermocyclerRunProfile should set blockTargetTemp to 30',
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
      const prevRobotState = merge({}, lidOpenRobotState, {
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
              slot: 'span7_8_10_11',
              moduleState: {
                ...lidOpenRobotState.modules[moduleId].moduleState,
                ...expectedUpdate,
              },
            },
          },
        },
        warnings: [],
      })
    })
  }

  blockTempTestCase.forEach(runTest)
  temperatureParamsCases.forEach(runTest)
  moduleOnlyParamsCases.forEach(runTest)
  profileCases.forEach(runTest)
})
