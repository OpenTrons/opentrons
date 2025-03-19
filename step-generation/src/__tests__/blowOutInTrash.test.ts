import { describe, it, expect, vi } from 'vitest'
import {
  DEFAULT_PIPETTE,
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { blowOutInTrash } from '../commandCreators/compound'
import type { CutoutId } from '@opentrons/shared-data'
import type { InvariantContext, RobotState } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

const mockCutout: CutoutId = 'cutoutA3'
const mockTrashId = 'mockTrashId'
let invariantContext: InvariantContext = {
  ...makeContext(),
  additionalEquipmentEntities: {
    [mockTrashId]: {
      id: mockTrashId,
      name: 'trashBin',
      pythonName: 'mock_trash_bin_1',
      location: mockCutout,
    },
  },
}
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('blowOutInTrash', () => {
  it('returns correct commands for blowout in a trash bin for a flex', () => {
    const result = blowOutInTrash(
      {
        pipetteId: DEFAULT_PIPETTE,
        flowRate: 10,
        trashId: mockTrashId,
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
        commandType: 'blowOutInPlace',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          flowRate: 10,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mockPythonName.blow_out(mock_trash_bin_1)'
    )
  })
})
