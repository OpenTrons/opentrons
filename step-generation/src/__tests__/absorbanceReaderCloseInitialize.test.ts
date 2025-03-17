import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'
import {
  ABSORBANCE_READER_TYPE,
  ABSORBANCE_READER_V1,
} from '@opentrons/shared-data'
import { absorbanceReaderCloseInitialize } from '../commandCreators'
import {
  absorbanceReaderStateGetter,
  getModuleState,
} from '../robotStateSelectors'
import { getInitialRobotStateStandard, makeContext } from '../fixtures'
import { getErrorResult, getSuccessResult } from '../fixtures/commandFixtures'
import { GRIPPER_LOCATION } from '../constants'

import type {
  AbsorbanceReaderInitializeArgs,
  AbsorbanceReaderState,
  InvariantContext,
  RobotState,
} from '../types'

vi.mock('../robotStateSelectors')

describe('absorbanceReaderCloseInitialize compound command creator', () => {
  let absorbanceReaderCloseInitializeArgs: AbsorbanceReaderInitializeArgs
  const ABSORBANCE_READER_MODULE_ID = 'absorbanceReaderModuleId'
  const ABSORBANCE_READER_MODULE_SLOT = 'D3'
  const GRIPPER_ID = 'gripperId'
  let robotState: RobotState
  let invariantContext: InvariantContext
  beforeEach(() => {
    absorbanceReaderCloseInitializeArgs = {
      commandCreatorFnName: 'absorbanceReaderInitialize',
      moduleId: ABSORBANCE_READER_MODULE_ID,
      measureMode: 'single',
      sampleWavelengths: [450],
      name: 'some name',
      description: 'some descirption',
    }
    invariantContext = {
      ...makeContext(),
      moduleEntities: {
        [ABSORBANCE_READER_MODULE_ID]: {
          id: ABSORBANCE_READER_MODULE_ID,
          type: ABSORBANCE_READER_TYPE,
          model: ABSORBANCE_READER_V1,
          pythonName: 'mock_absorbance_plate_reader_1',
        },
      },
      additionalEquipmentEntities: {
        [GRIPPER_ID]: {
          id: GRIPPER_ID,
          name: 'gripper',
          location: GRIPPER_LOCATION,
        },
      },
    }
    const state = getInitialRobotStateStandard(invariantContext)

    robotState = {
      ...state,
      modules: {
        ...state.modules,
        [ABSORBANCE_READER_MODULE_ID]: {
          slot: ABSORBANCE_READER_MODULE_SLOT,
        } as any,
      },
    }
    vi.mocked(getModuleState).mockReturnValue({
      type: ABSORBANCE_READER_TYPE,
    } as any)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should return an error when module is not found', () => {
    const result = absorbanceReaderCloseInitialize(
      absorbanceReaderCloseInitializeArgs,
      invariantContext,
      robotState
    )
    vi.mocked(absorbanceReaderStateGetter).mockReturnValue(null)

    expect(getErrorResult(result).errors).toHaveLength(1)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'MISSING_MODULE',
    })
  })
  it('should emit close and intalize commands if single mode', () => {
    vi.mocked(absorbanceReaderStateGetter).mockReturnValue(
      {} as AbsorbanceReaderState
    )

    const result = absorbanceReaderCloseInitialize(
      { ...absorbanceReaderCloseInitializeArgs, referenceWavelength: 450 },
      invariantContext,
      robotState
    )

    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'absorbanceReader/closeLid',
        key: expect.any(String),
        params: {
          moduleId: 'absorbanceReaderModuleId',
        },
      },
      {
        commandType: 'absorbanceReader/initialize',
        key: expect.any(String),
        params: {
          moduleId: 'absorbanceReaderModuleId',
          sampleWavelengths: [450],
          measureMode: 'single',
          referenceWavelength: 450,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `
mock_absorbance_plate_reader_1.close_lid()
mock_absorbance_plate_reader_1.initialize("single", [450], reference_wavelength=450)`.trimStart()
    )
  })
  it('should emit close and intalize commands if multi mode', () => {
    absorbanceReaderCloseInitializeArgs = {
      ...absorbanceReaderCloseInitializeArgs,
      measureMode: 'multi',
      sampleWavelengths: [450, 600],
    }
    vi.mocked(absorbanceReaderStateGetter).mockReturnValue(
      {} as AbsorbanceReaderState
    )

    const result = absorbanceReaderCloseInitialize(
      absorbanceReaderCloseInitializeArgs,
      invariantContext,
      robotState
    )

    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'absorbanceReader/closeLid',
        key: expect.any(String),
        params: {
          moduleId: 'absorbanceReaderModuleId',
        },
      },
      {
        commandType: 'absorbanceReader/initialize',
        key: expect.any(String),
        params: {
          moduleId: 'absorbanceReaderModuleId',
          sampleWavelengths: [450, 600],
          measureMode: 'multi',
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `
mock_absorbance_plate_reader_1.close_lid()
mock_absorbance_plate_reader_1.initialize("multi", [450, 600])`.trimStart()
    )
  })
})
