import { beforeEach, describe, it, expect, vi } from 'vitest'
import { WASTE_CHUTE_CUTOUT } from '@opentrons/shared-data'
import { getInitialRobotStateStandard, makeContext } from '../fixtures'
import { curryCommandCreator } from '../utils'
import { wasteChuteCommandsUtil } from '../utils/wasteChuteCommandsUtil'
import { dropTipInWasteChute } from '../commandCreators'
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
    wasteChuteCommandsUtil({ ...args, type: 'dispense' })
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
    wasteChuteCommandsUtil({
      ...args,
      type: 'blowOut',
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
  it('returns correct commands for drop tip', () => {
    wasteChuteCommandsUtil({
      ...args,
      type: 'dropTip',
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(dropTipInWasteChute, {
      pipetteId: mockId,
      addressableAreaName: mockAddressableAreaName,
    })
  })
  it('returns correct commands for air gap/aspirate in place', () => {
    wasteChuteCommandsUtil({
      ...args,
      type: 'airGap',
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
