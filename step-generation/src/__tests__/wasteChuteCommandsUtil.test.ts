import { describe, it, expect, vi } from 'vitest'
import { getInitialRobotStateStandard, makeContext } from '../fixtures'
import {
  airGapInWasteChute,
  blowoutInWasteChute,
  curryCommandCreator,
  dispenseInWasteChute,
} from '../utils'
import {
  airGapInPlace,
  blowOutInPlace,
  dispenseInPlace,
  moveToAddressableArea,
  prepareToAspirate,
} from '../commandCreators/atomic'
import type { PipetteEntities } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')
vi.mock('../utils/curryCommandCreator')

const mockId = 'mockId'

const invariantContext = makeContext()
const mockPipEntities: PipetteEntities = {
  [mockId]: {
    name: 'p50_single_flex',
    id: mockId,
    spec: { channels: 1 },
  },
} as any

const args = {
  pipetteId: mockId,
  volume: 10,
  flowRate: 10,
  prevRobotState: getInitialRobotStateStandard(invariantContext),
  invariantContext: {
    ...invariantContext,
    pipetteEntities: mockPipEntities,
  },
}
const mockMoveToAddressableAreaParams = {
  pipetteId: mockId,
  addressableAreaName: '1ChannelWasteChute',
  offset: { x: 0, y: 0, z: 0 },
}

describe('wasteChuteCommandsUtil', () => {
  it('returns correct commands for dispensing', () => {
    dispenseInWasteChute({ ...args })
    expect(curryCommandCreator).toHaveBeenCalledWith(
      moveToAddressableArea,
      mockMoveToAddressableAreaParams
    )
    expect(curryCommandCreator).toHaveBeenCalledWith(dispenseInPlace, {
      pipetteId: mockId,
      volume: 10,
      flowRate: 10,
    })
  })
  it('returns correct commands for blow out', () => {
    blowoutInWasteChute({
      ...args,
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(
      moveToAddressableArea,
      mockMoveToAddressableAreaParams
    )
    expect(curryCommandCreator).toHaveBeenCalledWith(blowOutInPlace, {
      pipetteId: mockId,
      flowRate: 10,
    })
  })
  it('returns correct commands for air gap/aspirate in place', () => {
    airGapInWasteChute({
      ...args,
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(
      moveToAddressableArea,
      mockMoveToAddressableAreaParams
    )
    expect(curryCommandCreator).toHaveBeenCalledWith(prepareToAspirate, {
      pipetteId: mockId,
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(airGapInPlace, {
      pipetteId: mockId,
      volume: 10,
      flowRate: 10,
    })
  })
})
