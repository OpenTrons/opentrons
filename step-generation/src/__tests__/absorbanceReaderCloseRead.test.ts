import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'
import { absorbanceReaderCloseRead } from '../commandCreators'
import {
  absorbanceReaderStateGetter,
  getModuleState,
} from '../robotStateSelectors'
import { getInitialRobotStateStandard, makeContext } from '../fixtures'
import { getErrorResult, getSuccessResult } from '../fixtures/commandFixtures'

import type {
  AbsorbanceReaderReadArgs,
  AbsorbanceReaderState,
  InvariantContext,
  RobotState,
} from '../types'
import {
  ABSORBANCE_READER_TYPE,
  ABSORBANCE_READER_V1,
} from '@opentrons/shared-data'

vi.mock('../robotStateSelectors')

describe('absorbanceReaderCloseRead compound command creator', () => {
  let absorbanceReaderCloseReadArgs: AbsorbanceReaderReadArgs
  const ABSORBANCE_READER_MODULE_ID = 'absorbanceReaderModuleId'
  const ABSORBANCE_READER_OUTPUT_PATH = 'outputPath.csv'
  const ABSORBANCE_READER_MODULE_SLOT = 'D3'
  const GRIPPER_ID = 'gripperId'
  let robotState: RobotState
  let invariantContext: InvariantContext
  beforeEach(() => {
    absorbanceReaderCloseReadArgs = {
      moduleId: ABSORBANCE_READER_MODULE_ID,
      fileName: null,
      commandCreatorFnName: 'absorbanceReaderRead',
      name: 'some name',
      description: 'some description',
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
    const result = absorbanceReaderCloseRead(
      absorbanceReaderCloseReadArgs,
      invariantContext,
      robotState
    )
    vi.mocked(absorbanceReaderStateGetter).mockReturnValue(null)

    expect(getErrorResult(result).errors).toHaveLength(2)
    expect(getErrorResult(result).errors[0]).toMatchObject({
      type: 'MISSING_MODULE',
    })
  })
  it('should emit close and read commands without fileName param', () => {
    vi.mocked(absorbanceReaderStateGetter).mockReturnValue({
      initialization: {},
    } as AbsorbanceReaderState)
    const result = absorbanceReaderCloseRead(
      absorbanceReaderCloseReadArgs,
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
        commandType: 'absorbanceReader/read',
        key: expect.any(String),
        params: {
          moduleId: 'absorbanceReaderModuleId',
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mock_absorbance_plate_reader_1.close_lid()\nmock_absorbance_plate_reader_1.read()'
    )
  })
  it('should emit close and read commands with fileName param', () => {
    vi.mocked(absorbanceReaderStateGetter).mockReturnValue({
      initialization: {},
    } as AbsorbanceReaderState)
    absorbanceReaderCloseReadArgs = {
      ...absorbanceReaderCloseReadArgs,
      fileName: ABSORBANCE_READER_OUTPUT_PATH,
    }
    const result = absorbanceReaderCloseRead(
      absorbanceReaderCloseReadArgs,
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
        commandType: 'absorbanceReader/read',
        key: expect.any(String),
        params: {
          moduleId: 'absorbanceReaderModuleId',
          fileName: ABSORBANCE_READER_OUTPUT_PATH,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `mock_absorbance_plate_reader_1.close_lid()\nmock_absorbance_plate_reader_1.read(export_filename="${ABSORBANCE_READER_OUTPUT_PATH}")`
    )
  })
})
