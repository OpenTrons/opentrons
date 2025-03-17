import { describe, it, expect } from 'vitest'
import {
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { airGapInTrash } from '../commandCreators/compound'
import type { CutoutId } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

const mockId = 'mockId'
const mockCutout: CutoutId = 'cutoutA3'
const invariantContext: InvariantContext = makeContext()
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('airGapInTrash', () => {
  it('returns correct commands for airGapInPlace over a trash bin', () => {
    const result = airGapInTrash(
      {
        pipetteId: mockId,
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
          pipetteId: mockId,
          addressableAreaName: 'movableTrashA3',
          offset: { x: 0, y: 0, z: 0 },
        },
      },
      {
        commandType: 'prepareToAspirate',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
        },
      },
      {
        commandType: 'airGapInPlace',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
          volume: 10,
          flowRate: 10,
        },
      },
    ])
  })
})
