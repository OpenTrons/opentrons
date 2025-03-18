import { describe, it, expect, vi } from 'vitest'
import {
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { blowOutInTrash } from '../commandCreators/compound'
import type { CutoutId } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

const mockId = 'mockId'
const mockCutout: CutoutId = 'cutoutA3'
const invariantContext: InvariantContext = makeContext()
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('blowOutInTrash', () => {
  it('returns correct commands for blowout in a trash bin', () => {
    const result = blowOutInTrash(
      {
        pipetteId: mockId,
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
        commandType: 'blowOutInPlace',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
          flowRate: 10,
        },
      },
    ])
  })
})
