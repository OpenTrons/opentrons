import { describe, it, expect } from 'vitest'
import {
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { airGapInWasteChute } from '../commandCreators/compound'
import type { InvariantContext, PipetteEntities, RobotState } from '../types'

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

describe('airGapInWasteChute', () => {
  it('returns correct commands for air gap in waste chute', () => {
    const result = airGapInWasteChute(
      {
        pipetteId: mockId,
        volume: 10,
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
          flowRate: 10,
          volume: 10,
        },
      },
    ])
  })
})
