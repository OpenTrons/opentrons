import { describe, it, expect, vi } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import { DEFAULT_PIPETTE, getSuccessResult, makeContext } from '../fixtures'
import { dropTipInWasteChute } from '../commandCreators'

import type { InvariantContext, RobotState } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

const mockWasteChuteId = 'mockWasteChuteId'

const invariantContext: InvariantContext = {
  ...makeContext(),
  additionalEquipmentEntities: {
    [mockWasteChuteId]: {
      name: 'wasteChute' as const,
      location: WASTE_CHUTE_CUTOUT,
      id: mockWasteChuteId,
      pythonName: 'mock_waste_chute_1',
    },
  },
}
const prevRobotState: RobotState = {
  tipState: { pipettes: { [DEFAULT_PIPETTE]: true } } as any,
} as any

describe('dropTipInWasteChute', () => {
  it('returns correct commands for drop tip in waste chute', () => {
    const args = {
      pipetteId: DEFAULT_PIPETTE,
      wasteChuteId: mockWasteChuteId,
    }
    const result = dropTipInWasteChute(args, invariantContext, prevRobotState)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          addressableAreaName: '1ChannelWasteChute',
          offset: { x: 0, y: 0, z: 0 },
        },
      },
      {
        commandType: 'dropTipInPlace',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      'mockPythonName.drop_tip(mock_waste_chute_1)'
    )
  })
})
