import { describe, it, expect, vi } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import {
  DEFAULT_PIPETTE,
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { blowOutInWasteChute } from '../commandCreators/compound'
import type { InvariantContext, RobotState } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

const wasteChuteId = 'wasteChuteId'
const invariantContext: InvariantContext = {
  ...makeContext(),
  wasteChuteEntities: {
    [wasteChuteId]: {
      id: wasteChuteId,
      pythonName: 'mock_waste_chute_1',
      location: WASTE_CHUTE_CUTOUT,
    },
  },
}
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('blowOutInWasteChute', () => {
  it('returns correct commands for blowing out in waste chute', () => {
    const result = blowOutInWasteChute(
      {
        pipetteId: DEFAULT_PIPETTE,
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
        commandType: 'blowOutInPlace',
        key: expect.any(String),
        params: {
          pipetteId: DEFAULT_PIPETTE,
          flowRate: 10,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `
mockPythonName.flow_rate.blow_out = 10
mockPythonName.blow_out(mock_waste_chute_1)`.trim()
    )
  })
})
