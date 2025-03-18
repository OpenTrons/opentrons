import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PIPETTE,
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { airGapInTrash } from '../commandCreators/compound'
import type { CutoutId } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

const mockCutout: CutoutId = 'cutoutA3'
const invariantContext: InvariantContext = makeContext()
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('airGapInTrash', () => {
  it('returns correct commands for airGapInPlace over a trash bin', () => {
    const result = airGapInTrash(
      {
        pipetteId: DEFAULT_PIPETTE,
        volume: 10,
        flowRate: 10,
        trashLocation: mockCutout,
      },
      invariantContext,
      prevRobotState
    )
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          addressableAreaName: 'movableTrashA3',
          offset: { x: 0, y: 0, z: 0 },
        },
      },
      {
        commandType: 'prepareToAspirate',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
        },
      },
      {
        commandType: 'airGapInPlace',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          volume: 10,
          flowRate: 10,
        },
      },
    ])
  })
})
