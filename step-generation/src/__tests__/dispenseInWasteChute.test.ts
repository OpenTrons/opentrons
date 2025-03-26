import { describe, it, expect, vi } from 'vitest'
import {
  getInitialRobotStateStandard,
  getSuccessResult,
  makeContext,
} from '../fixtures'
import { dispenseInWasteChute } from '../commandCreators/compound'
import type { InvariantContext, PipetteEntities, RobotState } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')

const mockId = 'mockId'
const mockWasteChuteId = 'mockWasteChute'
const mockPipEntities: PipetteEntities = {
  [mockId]: {
    name: 'p50_single_flex',
    id: mockId,
    spec: { channels: 1 },
    pythonName: 'mock_pipette_left',
  },
} as any

const invariantContext: InvariantContext = {
  ...makeContext(),
  pipetteEntities: mockPipEntities,
  additionalEquipmentEntities: {
    [mockWasteChuteId]: {
      id: mockWasteChuteId,
      name: 'wasteChute',
      pythonName: 'mock_waste_chute_1',
      location: mockWasteChuteId,
    },
  },
}
const prevRobotState: RobotState = getInitialRobotStateStandard(
  invariantContext
)

describe('dispenseInWasteChute', () => {
  it('returns correct commands for dispensing in waste chute', () => {
    const result = dispenseInWasteChute(
      {
        pipetteId: mockId,
        volume: 10,
        flowRate: 10,
        wasteChuteId: mockWasteChuteId,
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
        commandType: 'dispenseInPlace',
        key: expect.any(String),
        params: {
          pipetteId: mockId,
          flowRate: 10,
          volume: 10,
        },
      },
    ])
    expect(getSuccessResult(result).python).toBe(
      `
mock_pipette_left.dispense(
    volume=10,
    location=mock_waste_chute_1,
    rate=10 / mock_pipette_left.flow_rate.dispense,
)`.trimStart()
    )
  })
})
