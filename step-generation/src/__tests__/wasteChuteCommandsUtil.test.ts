import { beforeEach, describe, it, expect, vi } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
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

const mockWasteChuteId = 'mockWasteChuteId'
const mockAddressableAreaName: 'A3' = 'A3'
const mockId = 'mockId'

let invariantContext = makeContext()
const args = {
  pipetteId: mockId,
  addressableAreaName: mockAddressableAreaName,
  volume: 10,
  flowRate: 10,
  prevRobotState: getInitialRobotStateStandard(invariantContext),
}
const mockMoveToAddressableAreaParams = {
  pipetteId: mockId,
  addressableAreaName: mockAddressableAreaName,
  offset: { x: 0, y: 0, z: 0 },
}

const mockPipEntities: PipetteEntities = {
  [mockId]: {
    name: 'p50_single_flex',
    id: mockId,
  },
} as any

describe('wasteChuteCommandsUtil', () => {
  beforeEach(() => {
    invariantContext = {
      ...invariantContext,
      pipetteEntities: mockPipEntities,
      additionalEquipmentEntities: {
        [mockWasteChuteId]: {
          name: 'wasteChute',
          location: WASTE_CHUTE_CUTOUT,
          id: 'mockId',
        },
      },
    }
  })
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
