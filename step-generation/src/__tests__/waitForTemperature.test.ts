import { beforeEach, describe, it, expect } from 'vitest'
import { HEATERSHAKER_MODULE_TYPE } from '@opentrons/shared-data'
import {
  TEMPERATURE_AT_TARGET,
  TEMPERATURE_APPROACHING_TARGET,
  TEMPERATURE_DEACTIVATED,
} from '../constants'
import { waitForTemperature } from '../commandCreators/atomic/waitForTemperature'
import {
  getStateAndContextTempTCModules,
  robotWithStatusAndTemp,
} from '../fixtures'
import type { TemperatureParams } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

describe('waitForTemperature', () => {
  const temperatureModuleId = 'temperatureModuleId'
  const thermocyclerId = 'thermocyclerId'
  const prevRobotTemp = 42
  const missingModuleError = {
    errors: [
      {
        message: expect.any(String),
        type: 'MISSING_MODULE',
      },
    ],
  }
  const missingTemperatureStep = {
    errors: [
      {
        message: expect.any(String),
        type: 'MISSING_TEMPERATURE_STEP',
      },
    ],
  }
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
  it('temperature module id exists and temp status is approaching temp with a warning that the temp might not be hit', () => {
    const args: TemperatureParams = {
      moduleId: temperatureModuleId,
      celsius: 20,
    }
    const previousRobotState = robotWithStatusAndTemp(
      robotState,
      temperatureModuleId,
      TEMPERATURE_APPROACHING_TARGET,
      prevRobotTemp
    )
    const expected = {
      commands: [
        {
          commandType: 'temperatureModule/waitForTemperature',
          key: expect.any(String),
          params: {
            moduleId: temperatureModuleId,
            celsius: 20,
          },
        },
      ],
      warnings: [
        {
          type: 'TEMPERATURE_IS_POTENTIALLY_UNREACHABLE',
          message: expect.any(String),
        },
      ],
      python: 'mock_temperature_module_1.await_temperature(20)',
    }
    const result = waitForTemperature(
      args,
      invariantContext,
      previousRobotState
    )
    expect(result).toEqual(expected)
  })
  it('returns missing module error when module id does not exist', () => {
    const args: TemperatureParams = {
      moduleId: 'someNonexistentModuleId',
      celsius: 42,
    }
    const result = waitForTemperature(args, invariantContext, robotState)
    expect(result).toEqual(missingModuleError)
  })
  it('returns missing module error when module id is null', () => {
    const args: TemperatureParams = {
      //  @ts-expect-error: testing its null to trigger the error
      moduleId: null,
      celsius: 42,
    }
    const result = waitForTemperature(args, invariantContext, robotState)
    expect(result).toEqual(missingModuleError)
  })
  it('returns waitForTemperature command creator when temperature module already at target temp and awaiting that same temp', () => {
    const args: TemperatureParams = {
      moduleId: temperatureModuleId,
      celsius: 42,
    }
    const previousRobotState = robotWithStatusAndTemp(
      robotState,
      temperatureModuleId,
      TEMPERATURE_AT_TARGET,
      prevRobotTemp
    )
    const expected = {
      commands: [
        {
          commandType: 'temperatureModule/waitForTemperature',
          key: expect.any(String),
          params: {
            moduleId: temperatureModuleId,
            celsius: 42,
          },
        },
      ],
      python: 'mock_temperature_module_1.await_temperature(42)',
    }
    const result = waitForTemperature(
      args,
      invariantContext,
      previousRobotState
    )
    expect(result).toEqual(expected)
  })
  it('returns missing temperature step error when temperature module already at target temp and awaiting different temp', () => {
    const args: TemperatureParams = {
      moduleId: temperatureModuleId,
      celsius: 80,
    }
    const previousRobotState = robotWithStatusAndTemp(
      robotState,
      temperatureModuleId,
      TEMPERATURE_AT_TARGET,
      prevRobotTemp
    )
    const result = waitForTemperature(
      args,
      invariantContext,
      previousRobotState
    )
    expect(result).toEqual(missingTemperatureStep)
  })
  it('returns missing temperature step error when prev temp state is DEACTIVATED', () => {
    const args: TemperatureParams = {
      moduleId: temperatureModuleId,
      celsius: 80,
    }
    const previousRobotState = robotWithStatusAndTemp(
      robotState,
      temperatureModuleId,
      TEMPERATURE_DEACTIVATED,
      prevRobotTemp
    )
    const result = waitForTemperature(
      args,
      invariantContext,
      previousRobotState
    )
    expect(result).toEqual(missingTemperatureStep)
  })
  it('renders the correct comand and python for a heater-shaker waitForTemperature', () => {
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
    robotState = {
      ...robotState,
      modules: {
        heaterShakerId: {
          slot: 'A1',
          moduleState: {
            type: HEATERSHAKER_MODULE_TYPE,
            targetTemp: null,
            latchOpen: false,
            targetSpeed: null,
          },
        },
      },
    }
    const args: TemperatureParams = {
      moduleId: heaterShakerId,
      celsius: 80,
    }

    expect(waitForTemperature(args, invariantContext, robotState)).toEqual({
      commands: [
        {
          commandType: 'heaterShaker/waitForTemperature',
          key: expect.any(String),
          params: {
            moduleId: heaterShakerId,
            celsius: 80,
          },
        },
      ],
      python: 'mock_heater_shaker_module_1.wait_for_temperature()',
    })
  })
})
