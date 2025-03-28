import { beforeEach, describe, it, expect } from 'vitest'
import { getStateAndContextTempTCModules } from '../fixtures'
import { deactivateTemperature } from '../commandCreators/atomic/deactivateTemperature'
import type { InvariantContext, RobotState } from '../types'
import type { ModuleOnlyParams } from '@opentrons/shared-data'
const temperatureModuleId = 'temperatureModuleId'
const thermocyclerId = 'thermocyclerId'
let invariantContext: InvariantContext
let robotState: RobotState
beforeEach(() => {
  const stateAndContext = getStateAndContextTempTCModules({
    temperatureModuleId,
    thermocyclerId,
  })
  invariantContext = stateAndContext.invariantContext
  robotState = stateAndContext.robotState
})
describe('deactivateTemperature', () => {
  const missingModuleError = {
    errors: [
      {
        message: expect.any(String),
        type: 'MISSING_MODULE',
      },
    ],
  }
  const testCases = [
    {
      testName: 'temperature module',
      moduleId: temperatureModuleId,
      expected: {
        commands: [
          {
            commandType: 'temperatureModule/deactivate',
            key: expect.any(String),
            params: {
              moduleId: temperatureModuleId,
            },
          },
        ],
        python: 'mock_temperature_module_1.deactivate()',
      },
    },
    {
      testName: 'no such moduleId',
      moduleId: 'someNonexistentModuleId',
      expected: missingModuleError,
    },
    {
      testName: 'null moduleId',
      moduleId: null,
      expected: missingModuleError,
    },
  ]
  testCases.forEach(({ expected, moduleId, testName }) => {
    it(testName, () => {
      const args: ModuleOnlyParams = {
        moduleId: moduleId ?? '',
      }
      const result = deactivateTemperature(args, invariantContext, robotState)
      expect(result).toEqual(expected)
    })
  })
})
