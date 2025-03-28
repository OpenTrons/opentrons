import { describe, it, expect } from 'vitest'
import { thermocyclerSetTargetBlockTemperature } from '../commandCreators/atomic/thermocyclerSetTargetBlockTemperature'
import { thermocyclerSetTargetLidTemperature } from '../commandCreators/atomic/thermocyclerSetTargetLidTemperature'
import { thermocyclerWaitForBlockTemperature } from '../commandCreators/atomic/thermocyclerWaitForBlockTemperature'
import { thermocyclerWaitForLidTemperature } from '../commandCreators/atomic/thermocyclerWaitForLidTemperature'
import { thermocyclerDeactivateBlock } from '../commandCreators/atomic/thermocyclerDeactivateBlock'
import { thermocyclerDeactivateLid } from '../commandCreators/atomic/thermocyclerDeactivateLid'
import { thermocyclerRunProfile } from '../commandCreators/atomic/thermocyclerRunProfile'
import { thermocyclerCloseLid } from '../commandCreators/atomic/thermocyclerCloseLid'
import { thermocyclerOpenLid } from '../commandCreators/atomic/thermocyclerOpenLid'
import { getSuccessResult } from '../fixtures'
import type {
  AtomicProfileStep,
  ModuleOnlyParams,
  TemperatureParams,
  TCProfileParams,
} from '@opentrons/shared-data/protocol/types/schemaV4'
import type { CommandCreator, ModuleEntities } from '../types'

const getRobotInitialState = (): any => {
  // This particular state shouldn't matter for these command creators
  return {}
}

// neither should InvariantContext
let invariantContext: any = {}
const module: ModuleOnlyParams['module'] = 'someTCModuleId'
const temperature: TemperatureParams['temperature'] = 42
const holdTime: AtomicProfileStep['holdTime'] = 10
const volume: TCProfileParams['volume'] = 10
const profile = [
  {
    celsius: temperature,
    holdSeconds: holdTime,
  },
]
invariantContext = {
  ...invariantContext,
  moduleEntities: {
    [module]: {
      id: module,
      type: 'thermocyclerModuleType',
      model: 'thermocyclerModuleV1',
      pythonName: 'mock_thermocycler',
    },
  } as ModuleEntities,
}
describe('thermocycler atomic commands', () => {
  const testCasesSetBlock = [
    {
      commandCreator: thermocyclerSetTargetBlockTemperature,
      expectedType: 'thermocycler/setTargetBlockTemperature',
      params: {
        moduleId: module,
        celsius: temperature,
      },
    },
  ]
  const testCasesWithTempParam = [
    {
      commandCreator: thermocyclerSetTargetLidTemperature,
      expectedType: 'thermocycler/setTargetLidTemperature',
      params: {
        moduleId: module,
        celsius: temperature,
      },
    },
    {
      commandCreator: thermocyclerWaitForBlockTemperature,
      expectedType: 'thermocycler/waitForBlockTemperature',
      params: {
        moduleId: module,
      },
    },
    {
      commandCreator: thermocyclerWaitForLidTemperature,
      expectedType: 'thermocycler/waitForLidTemperature',
      params: {
        moduleId: module,
      },
    },
  ]
  const testCasesModuleOnly = [
    {
      commandCreator: thermocyclerDeactivateBlock,
      expectedType: 'thermocycler/deactivateBlock',
      params: {
        moduleId: module,
      },
    },
    {
      commandCreator: thermocyclerDeactivateLid,
      expectedType: 'thermocycler/deactivateLid',
      params: {
        moduleId: module,
      },
    },
    {
      commandCreator: thermocyclerCloseLid,
      expectedType: 'thermocycler/closeLid',
      params: {
        moduleId: module,
      },
    },
    {
      commandCreator: thermocyclerOpenLid,
      expectedType: 'thermocycler/openLid',
      params: {
        moduleId: module,
      },
    },
  ]
  const testCasesRunProfile = [
    {
      commandCreator: thermocyclerRunProfile,
      expectedType: 'thermocycler/runProfile',
      params: {
        moduleId: module,
        profile,
        blockMaxVolumeUl: volume,
      },
    },
  ]

  const testParams = ({
    commandCreator,
    params,
    expectedType,
  }: {
    commandCreator: CommandCreator<any>
    params: any
    expectedType: string
  }): void => {
    it(`creates a single "${expectedType}" command with the given params`, () => {
      const robotInitialState = getRobotInitialState()

      // Use params directly from the test case
      const result = commandCreator(params, invariantContext, robotInitialState)
      const res = getSuccessResult(result)

      expect(res.commands).toEqual([
        {
          commandType: expectedType,
          key: expect.any(String),
          params,
        },
      ])
    })
  }

  // Run all test cases
  testCasesSetBlock.forEach(testParams)
  testCasesWithTempParam.forEach(testParams)
  testCasesModuleOnly.forEach(testParams)
  testCasesRunProfile.forEach(testParams)
})
