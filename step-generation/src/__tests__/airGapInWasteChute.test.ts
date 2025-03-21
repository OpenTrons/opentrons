import { describe, it, expect } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import {
  DEFAULT_PIPETTE,
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { airGapInWasteChute } from '../commandCreators/compound'
import type { InvariantContext, RobotState } from '../types'

const wasteChuteId = 'wasteChuteId'
const invariantContext: InvariantContext = {
  ...makeContext(),
  additionalEquipmentEntities: {
    [wasteChuteId]: {
      id: wasteChuteId,
      name: 'wasteChute',
      pythonName: 'mock_waste_chute_1',
      location: WASTE_CHUTE_CUTOUT,
    },
  },
}
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('airGapInWasteChute', () => {
  it('returns correct commands for air gap in waste chute', () => {
    const result = airGapInWasteChute(
      {
        pipetteId: DEFAULT_PIPETTE,
        volume: 10,
        flowRate: 10,
        wasteChuteId,
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
          addressableAreaName: '1ChannelWasteChute',
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
          flowRate: 10,
          volume: 10,
        },
      },
    ])
  })
})
