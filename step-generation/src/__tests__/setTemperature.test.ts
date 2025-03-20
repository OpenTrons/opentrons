import { beforeEach, describe, it, expect } from 'vitest'
import { HEATERSHAKER_MODULE_TYPE } from '@opentrons/shared-data'
import { getStateAndContextTempTCModules } from '../fixtures'
import { setTemperature } from '../commandCreators/atomic/setTemperature'
import type { InvariantContext, RobotState } from '../types'
import type { TemperatureParams } from '@opentrons/shared-data'

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

describe('setTemperature', () => {
  const targetTemperature = 42
  const missingModuleError = {
    errors: [{ message: expect.any(String), type: 'MISSING_MODULE' }],
  }

  const testCases = [
    {
      testName: 'temperature module',
      moduleId: temperatureModuleId,
      expected: {
        commands: [
          {
            commandType: 'temperatureModule/setTargetTemperature',
            key: expect.any(String),
            params: {
              moduleId: temperatureModuleId,
              celsius: targetTemperature,
            },
          },
        ],
        python: `mock_temperature_module_1.start_set_temperature(${targetTemperature})`,
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
      const args: TemperatureParams = {
        moduleId: moduleId ?? '',
        celsius: targetTemperature,
      }
      const result = setTemperature(args, invariantContext, robotState)
      expect(result).toEqual(expected)
    })
  })
  it('renders the correct comands and python for a heater-shaker setTemperature', () => {
    const heaterShakerId = 'heaterShakerId'
    invariantContext = {
      ...invariantContext,
      moduleEntities: {
        heaterShakerId: {
          id: heaterShakerId,
          type: HEATERSHAKER_MODULE_TYPE,
          model: 'heaterShakerModuleV1',
          pythonName: 'mock_heater_shaker_module_1',
        },
      },
    }
    const args: TemperatureParams = {
      moduleId: heaterShakerId,
      celsius: targetTemperature,
    }

    expect(setTemperature(args, invariantContext, robotState)).toEqual({
      commands: [
        {
          commandType: 'heaterShaker/setTargetTemperature',
          key: expect.any(String),
          params: {
            moduleId: heaterShakerId,
            celsius: targetTemperature,
          },
        },
      ],
      python: `mock_heater_shaker_module_1.set_target_temperature(${targetTemperature})`,
    })
  })
})
