import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'
import {
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
} from '@opentrons/shared-data'
import { heaterShaker } from '../commandCreators'
import { getModuleState } from '../robotStateSelectors'
import { getInitialRobotStateStandard, makeContext } from '../fixtures'
import { getErrorResult, getSuccessResult } from '../fixtures/commandFixtures'

import type { InvariantContext, RobotState, HeaterShakerArgs } from '../types'

vi.mock('../robotStateSelectors')

describe('heaterShaker compound command creator', () => {
  let heaterShakerArgs: HeaterShakerArgs
  const HEATER_SHAKER_ID = 'heaterShakerId'
  const HEATER_SHAKER_SLOT = '1'
  let robotState: RobotState
  let invariantContext: InvariantContext
  const name = 'some name'
  const description = 'description'
  beforeEach(() => {
    heaterShakerArgs = {
      moduleId: HEATER_SHAKER_ID,
      rpm: null,
      commandCreatorFnName: 'heaterShaker',
      targetTemperature: null,
      latchOpen: false,
      timerMinutes: null,
      timerSeconds: null,
      name,
      description,
    }
    invariantContext = {
      ...makeContext(),
      moduleEntities: {
        [HEATER_SHAKER_ID]: {
          id: HEATER_SHAKER_ID,
          type: HEATERSHAKER_MODULE_TYPE,
          model: HEATERSHAKER_MODULE_V1,
          pythonName: 'mock_heater_shaker_1',
        },
      },
    }
    const state = getInitialRobotStateStandard(invariantContext)

    robotState = {
      ...state,
      modules: {
        ...state.modules,
        [HEATER_SHAKER_ID]: {
          slot: HEATER_SHAKER_SLOT,
        } as any,
      },
    }
    vi.mocked(getModuleState).mockReturnValue({
      type: HEATERSHAKER_MODULE_TYPE,
    } as any)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should return an error when there is no module id', () => {
    heaterShakerArgs = {
      ...heaterShakerArgs,
      moduleId: null,
    }
    const result = heaterShaker(heaterShakerArgs, invariantContext, robotState)

    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'MISSING_MODULE',
    })
  })
  it('should waitForDuration and deactivate the heater shaker when a user specificies a timer', () => {
    heaterShakerArgs = {
      ...heaterShakerArgs,
      rpm: 444,
      targetTemperature: 80,
      timerSeconds: 30,
    }
    const result = heaterShaker(heaterShakerArgs, invariantContext, robotState)

    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'heaterShaker/closeLabwareLatch',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/setTargetTemperature',
        key: expect.any(String),
        params: {
          celsius: 80,
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/setAndWaitForShakeSpeed',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
          rpm: 444,
        },
      },
      {
        commandType: 'waitForDuration',
        key: expect.any(String),
        params: {
          seconds: 30,
        },
      },
      {
        commandType: 'heaterShaker/deactivateShaker',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/deactivateHeater',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mock_heater_shaker_1.close_labware_latch()\nmock_heater_shaker_1.set_target_temperature(80)\nmock_heater_shaker_1.set_and_wait_for_shake_speed(444)\nprotocol.delay(seconds=30)\nmock_heater_shaker_1.deactivate_shaker()\nmock_heater_shaker_1.deactivate_heater()'
    )
  })
  it('should NOT delay and deactivate the heater shaker when a user specificies a timer that is 0 seconds', () => {
    heaterShakerArgs = {
      ...heaterShakerArgs,
      rpm: 444,
      targetTemperature: 80,
      timerSeconds: 0,
      timerMinutes: 0,
    }
    const result = heaterShaker(heaterShakerArgs, invariantContext, robotState)

    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'heaterShaker/closeLabwareLatch',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/setTargetTemperature',
        key: expect.any(String),
        params: {
          celsius: 80,
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/setAndWaitForShakeSpeed',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
          rpm: 444,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mock_heater_shaker_1.close_labware_latch()\nmock_heater_shaker_1.set_target_temperature(80)\nmock_heater_shaker_1.set_and_wait_for_shake_speed(444)'
    )
  })
  it('should delay and emit open latch last if open latch is specified', () => {
    heaterShakerArgs = {
      moduleId: HEATER_SHAKER_ID,
      rpm: null,
      commandCreatorFnName: 'heaterShaker',
      targetTemperature: null,
      latchOpen: true,
      timerMinutes: null,
      timerSeconds: null,
      name,
      description,
    }

    heaterShakerArgs = {
      ...heaterShakerArgs,
      rpm: 444,
      targetTemperature: 80,
      timerSeconds: 20,
      timerMinutes: 0,
    }
    const result = heaterShaker(heaterShakerArgs, invariantContext, robotState)

    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'heaterShaker/setTargetTemperature',
        key: expect.any(String),
        params: {
          celsius: 80,
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/setAndWaitForShakeSpeed',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
          rpm: 444,
        },
      },
      {
        commandType: 'waitForDuration',
        key: expect.any(String),
        params: {
          seconds: 20,
        },
      },
      {
        commandType: 'heaterShaker/deactivateShaker',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/deactivateHeater',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/openLabwareLatch',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mock_heater_shaker_1.set_target_temperature(80)\nmock_heater_shaker_1.set_and_wait_for_shake_speed(444)\nprotocol.delay(seconds=20)\nmock_heater_shaker_1.deactivate_shaker()\nmock_heater_shaker_1.deactivate_heater()\nmock_heater_shaker_1.open_labware_latch()'
    )
  })
  it('should not call deactivateShaker when it is not shaking but call activate temperature when setting target temp', () => {
    heaterShakerArgs = {
      ...heaterShakerArgs,
      rpm: null,
      targetTemperature: 80,
    }

    const state = getInitialRobotStateStandard(invariantContext)

    robotState = {
      ...state,
      modules: {
        ...state.modules,
        [HEATER_SHAKER_ID]: {
          slot: HEATER_SHAKER_SLOT,
          moduleState: {
            type: 'heaterShakerModuleType',
            targetSpeed: null,
          },
        } as any,
      },
    }

    const result = heaterShaker(heaterShakerArgs, invariantContext, robotState)

    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'heaterShaker/closeLabwareLatch',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/setTargetTemperature',
        key: expect.any(String),
        params: {
          celsius: 80,
          moduleId: 'heaterShakerId',
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mock_heater_shaker_1.close_labware_latch()\nmock_heater_shaker_1.set_target_temperature(80)'
    )
  })
  it('should call to open latch last', () => {
    heaterShakerArgs = {
      ...heaterShakerArgs,
      latchOpen: true,
    }

    const state = getInitialRobotStateStandard(invariantContext)

    robotState = {
      ...state,
      modules: {
        ...state.modules,
        [HEATER_SHAKER_ID]: {
          slot: HEATER_SHAKER_SLOT,
        } as any,
      },
    }

    const result = heaterShaker(heaterShakerArgs, invariantContext, robotState)

    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'heaterShaker/deactivateHeater',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
      {
        commandType: 'heaterShaker/openLabwareLatch',
        key: expect.any(String),
        params: {
          moduleId: 'heaterShakerId',
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mock_heater_shaker_1.deactivate_heater()\nmock_heater_shaker_1.open_labware_latch()'
    )
  })
})
