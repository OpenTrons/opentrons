import { describe, it, expect, vi } from 'vitest'
import {
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { blowOutInWasteChute } from '../commandCreators/compound'
import type { InvariantContext, PipetteEntities, RobotState } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

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
}
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('blowOutInWasteChute', () => {
  it('returns correct commands for blowing out in waste chute', () => {
    const result = blowOutInWasteChute(
      {
        pipetteId: mockId,
        flowRate: 10,
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
          addressableAreaName: '1ChannelWasteChute',
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
