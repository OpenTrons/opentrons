import { describe, it, expect, vi } from 'vitest'
import {
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { dropTipInTrash } from '../commandCreators/compound/dropTipInTrash'
import type { InvariantContext, PipetteEntities, RobotState } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

const mockTrashBinId = 'mockTrashBinId'
const mockId = 'mockId'

const mockPipEntities: PipetteEntities = {
  [mockId]: {
    name: 'p50_single_flex',
    id: mockId,
    spec: { channels: 1 },
  },
} as any
const mockCutout = 'cutoutA3'
const invariantContext: InvariantContext = {
  ...makeContext(),
  pipetteEntities: mockPipEntities,
  additionalEquipmentEntities: {
    [mockTrashBinId]: {
      name: 'trashBin' as const,
      location: mockCutout,
      id: mockTrashBinId,
    },
  },
}
const prevRobotState: RobotState = {
  ...getInitialRobotStateStandard(invariantContext),
  tipState: { pipettes: { [mockId]: true } } as any,
}

describe('dropTipInTrash', () => {
  it('returns correct commands for drop tip', () => {
    const args = {
      pipetteId: mockId,
    }
    const result = dropTipInTrash(args, invariantContext, prevRobotState)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveToAddressableAreaForDropTip',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
          addressableAreaName: 'movableTrashA3',
          offset: { x: 0, y: 0, z: 0 },
          alternateDropLocation: true,
        },
      },
      {
        commandType: 'dropTipInPlace',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
        },
      },
    ])
  })
})
