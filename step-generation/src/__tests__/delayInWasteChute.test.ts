import { describe, it, expect } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import {
  makeContext,
  getSuccessResult,
  getInitialRobotStateStandard,
} from '../fixtures'
import { delayInWasteChute } from '../commandCreators/compound'
import type { RobotState, InvariantContext } from '../types'

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

describe('delayInWasteChute', () => {
  it('moves to waste chute and delays', () => {
    const args = {
      pipetteId: 'p10SingleId',
      seconds: 30,
    }

    const result = delayInWasteChute(args, invariantContext, prevRobotState)
    const res = getSuccessResult(result)
    expect(res.commands).toEqual([
      {
        commandType: 'moveToAddressableArea',
        key: expect.any(String),
        params: {
          pipetteId: 'p10SingleId',
          offset: { x: 0, y: 0, z: 0 },
          addressableAreaName: '1ChannelWasteChute',
        },
      },
      {
        commandType: 'waitForDuration',
        key: expect.any(String),
        params: {
          seconds: 30,
        },
      },
    ])
  })
})
