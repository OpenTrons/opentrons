import { describe, it, expect, vi } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import { getSuccessResult, makeContext } from '../fixtures'
import { dropTipInWasteChute } from '../commandCreators'
import type { AddressableAreaName } from '@opentrons/shared-data'

import type { InvariantContext, PipetteEntities, RobotState } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

const mockWasteChuteId = 'mockWasteChuteId'
const mockId = 'mockId'

const mockPipEntities: PipetteEntities = {
  [mockId]: {
    name: 'p50_single_flex',
    id: mockId,
    spec: { channels: 1 },
  },
} as any

const invariantContext: InvariantContext = {
  ...makeContext(),
  pipetteEntities: mockPipEntities,
  additionalEquipmentEntities: {
    [mockWasteChuteId]: {
      name: 'wasteChute' as const,
      location: WASTE_CHUTE_CUTOUT,
      id: mockWasteChuteId,
    },
  },
}
const prevRobotState: RobotState = {
  tipState: { pipettes: { [mockId]: true } } as any,
} as any

describe('dropTipInWasteChute', () => {
  it('returns correct commands for drop tip', () => {
    const args = {
      pipetteId: mockId,
      addressableAreaName: '1ChannelWasteChute' as AddressableAreaName,
    }
    const result = dropTipInWasteChute(args, invariantContext, prevRobotState)
    expect(getSuccessResult(result).commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
          addressableAreaName: '1ChannelWasteChute',
          offset: { x: 0, y: 0, z: 0 },
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
