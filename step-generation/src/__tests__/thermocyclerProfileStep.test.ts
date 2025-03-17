import { describe, it, expect } from 'vitest'
import { THERMOCYCLER_MODULE_TYPE } from '@opentrons/shared-data'
import { thermocyclerProfileStep } from '../commandCreators/compound/thermocyclerProfileStep'
import {
  getErrorResult,
  getStateAndContextTempTCModules,
  getSuccessResult,
} from '../fixtures'
import type { CreateCommand } from '@opentrons/shared-data/protocol/types/schemaV6'
import type {
  ThermocyclerModuleState,
  ThermocyclerProfileStepArgs,
} from '../types'

const temperatureModuleId = 'temperatureModuleId'
const thermocyclerId = 'thermocyclerId'

describe('thermocyclerProfileStep', () => {
  const testCases: Array<{
    testName: string
    initialThermocyclerModuleState?: ThermocyclerModuleState
    args: ThermocyclerProfileStepArgs
    expected: CreateCommand[]
    expectedPython: string
  }> = [
    {
      testName: 'should generate expected commands',
      args: {
        commandCreatorFnName: 'thermocyclerProfile',
        blockTargetTempHold: 4,
        lidTargetTempHold: null,
        lidOpenHold: true,
        moduleId: thermocyclerId,
        profileSteps: [],
        profileTargetLidTemp: 55,
        profileVolume: 42,
      },
      expected: [
        {
          commandType: 'thermocycler/closeLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/setTargetLidTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            celsius: 55,
          },
        },
        {
          commandType: 'thermocycler/waitForLidTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/runProfile',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            profile: [],
            blockMaxVolumeUl: 42,
          },
        },
        {
          commandType: 'thermocycler/openLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/setTargetBlockTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            celsius: 4,
          },
        },
        {
          commandType: 'thermocycler/waitForBlockTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/deactivateLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
      ],
      expectedPython: `
mock_thermocycler.close_lid()
mock_thermocycler.set_lid_temperature(55)
mock_thermocycler.execute_profile(
    [

    ],
    1,
    block_max_volume=42,
)
mock_thermocycler.open_lid()
mock_thermocycler.set_block_temperature(4)
mock_thermocycler.deactivate_lid()`.trimStart(),
    },
    {
      testName:
        'should omit the setTargetLidTemperature when lid temp is already at desired temp',
      initialThermocyclerModuleState: {
        type: THERMOCYCLER_MODULE_TYPE,
        blockTargetTemp: null,
        lidTargetTemp: 55,
        lidOpen: false,
      },
      args: {
        commandCreatorFnName: 'thermocyclerProfile',
        blockTargetTempHold: 4,
        lidTargetTempHold: null,
        lidOpenHold: true,
        moduleId: thermocyclerId,
        profileSteps: [{ temperature: 61, holdTime: 99 }],
        profileTargetLidTemp: 55,
        profileVolume: 42,
      },
      expected: [
        {
          commandType: 'thermocycler/runProfile',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            profile: [{ celsius: 61, holdSeconds: 99 }],
            blockMaxVolumeUl: 42,
          },
        },
        {
          commandType: 'thermocycler/openLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/setTargetBlockTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            celsius: 4,
          },
        },
        {
          commandType: 'thermocycler/waitForBlockTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/deactivateLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
      ],
      expectedPython: `
mock_thermocycler.execute_profile(
    [
        {"temperature": 61, "hold_time_seconds": 99},
    ],
    1,
    block_max_volume=42,
)
mock_thermocycler.open_lid()
mock_thermocycler.set_block_temperature(4)
mock_thermocycler.deactivate_lid()`.trimStart(),
    },
    {
      testName:
        'should close the lid before running the profile if the lid open state is null',
      initialThermocyclerModuleState: {
        type: THERMOCYCLER_MODULE_TYPE,
        blockTargetTemp: null,
        lidTargetTemp: 55,
        lidOpen: null,
      },
      args: {
        commandCreatorFnName: 'thermocyclerProfile',
        blockTargetTempHold: 4,
        lidTargetTempHold: null,
        lidOpenHold: true,
        moduleId: thermocyclerId,
        profileSteps: [{ temperature: 61, holdTime: 99 }],
        profileTargetLidTemp: 55,
        profileVolume: 42,
      },
      expected: [
        {
          commandType: 'thermocycler/closeLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/runProfile',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            profile: [{ celsius: 61, holdSeconds: 99 }],
            blockMaxVolumeUl: 42,
          },
        },
        {
          commandType: 'thermocycler/openLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/setTargetBlockTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            celsius: 4,
          },
        },
        {
          commandType: 'thermocycler/waitForBlockTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/deactivateLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
      ],
      expectedPython: `
mock_thermocycler.close_lid()
mock_thermocycler.execute_profile(
    [
        {"temperature": 61, "hold_time_seconds": 99},
    ],
    1,
    block_max_volume=42,
)
mock_thermocycler.open_lid()
mock_thermocycler.set_block_temperature(4)
mock_thermocycler.deactivate_lid()`.trimStart(),
    },
    {
      testName:
        'should omit the closeLid when the lid open state is false before running a profile',
      initialThermocyclerModuleState: {
        type: THERMOCYCLER_MODULE_TYPE,
        blockTargetTemp: null,
        lidTargetTemp: 55,
        lidOpen: false,
      },
      args: {
        commandCreatorFnName: 'thermocyclerProfile',
        blockTargetTempHold: 4,
        lidTargetTempHold: null,
        lidOpenHold: true,
        moduleId: thermocyclerId,
        profileSteps: [{ temperature: 61, holdTime: 99 }],
        profileTargetLidTemp: 55,
        profileVolume: 42,
      },
      expected: [
        {
          commandType: 'thermocycler/runProfile',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            profile: [{ celsius: 61, holdSeconds: 99 }],
            blockMaxVolumeUl: 42,
          },
        },
        {
          commandType: 'thermocycler/openLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/setTargetBlockTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
            celsius: 4,
          },
        },
        {
          commandType: 'thermocycler/waitForBlockTemperature',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
        {
          commandType: 'thermocycler/deactivateLid',
          key: expect.any(String),
          params: {
            moduleId: 'thermocyclerId',
          },
        },
      ],
      expectedPython: `
mock_thermocycler.execute_profile(
    [
        {"temperature": 61, "hold_time_seconds": 99},
    ],
    1,
    block_max_volume=42,
)
mock_thermocycler.open_lid()
mock_thermocycler.set_block_temperature(4)
mock_thermocycler.deactivate_lid()`.trimStart(),
    },
  ]

  testCases.forEach(
    ({
      testName,
      args,
      expected,
      initialThermocyclerModuleState,
      expectedPython,
    }) => {
      it(testName, () => {
        const {
          robotState,
          invariantContext,
        } = getStateAndContextTempTCModules({
          temperatureModuleId,
          thermocyclerId,
        })

        if (initialThermocyclerModuleState) {
          robotState.modules[
            thermocyclerId
          ].moduleState = initialThermocyclerModuleState
        }

        const result = thermocyclerProfileStep(
          args,
          invariantContext,
          robotState
        )
        const { commands, python } = getSuccessResult(result)
        expect(commands).toEqual(expected)
        expect(python).toEqual(expectedPython)
      })
    }
  )

  it('should return timeline error with bad moduleId', () => {
    const { robotState, invariantContext } = getStateAndContextTempTCModules({
      temperatureModuleId,
      thermocyclerId,
    })

    const args: ThermocyclerProfileStepArgs = {
      commandCreatorFnName: 'thermocyclerProfile',
      blockTargetTempHold: 4,
      lidTargetTempHold: null,
      lidOpenHold: true,
      moduleId: 'badModuleId',
      profileSteps: [],
      profileTargetLidTemp: 55,
      profileVolume: 42,
    }

    const result = thermocyclerProfileStep(args, invariantContext, robotState)

    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'MISSING_MODULE',
    })
  })
})
