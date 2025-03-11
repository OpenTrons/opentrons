import { describe, it, expect, vi } from 'vitest'
import { getInitialRobotStateStandard, makeContext } from '../fixtures'
import { curryCommandCreator } from '../utils'
import {
  airGapInMovableTrash,
  blowOutInMovableTrash,
  dispenseInMovableTrash,
  dropTipInMovableTrash,
} from '../utils/movableTrashCommandsUtil'
import {
  airGapInPlace,
  blowOutInPlace,
  dispenseInPlace,
  dropTipInPlace,
  moveToAddressableArea,
  moveToAddressableAreaForDropTip,
  prepareToAspirate,
} from '../commandCreators/atomic'
import type { PipetteEntities } from '../types'

vi.mock('../getNextRobotStateAndWarnings/dispenseUpdateLiquidState')
vi.mock('../utils/curryCommandCreator')

const mockTrashBinId = 'mockTrashBinId'
const mockId = 'mockId'

const mockPipEntities: PipetteEntities = {
  [mockId]: {
    name: 'p50_single_flex',
    id: mockId,
  },
} as any
const mockCutout = 'cutoutA3'
const mockMoveToAddressableAreaParams = {
  pipetteId: mockId,
  addressableAreaName: 'movableTrashA3',
  offset: { x: 0, y: 0, z: 0 },
}
const invariantContext = makeContext()

const args = {
  pipetteId: mockId,
  volume: 10,
  flowRate: 10,
  invariantContext: {
    ...invariantContext,
    pipetteEntities: mockPipEntities,
    additionalEquipmentEntities: {
      [mockTrashBinId]: {
        name: 'trashBin' as const,
        location: mockCutout,
        id: mockTrashBinId,
      },
    },
  },
  prevRobotState: getInitialRobotStateStandard(invariantContext),
}

describe('movableTrashCommandsUtil', () => {
  it('returns correct commands for dispensing', () => {
    dispenseInMovableTrash({ ...args })
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
    blowOutInMovableTrash({ ...args })
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
    dropTipInMovableTrash({
      ...args,
      prevRobotState: {
        ...args.prevRobotState,
        tipState: { pipettes: { [mockId]: true } } as any,
      },
    })
    expect(curryCommandCreator).toHaveBeenCalledWith(
      moveToAddressableAreaForDropTip,
      {
        pipetteId: mockId,
        addressableAreaName: 'movableTrashA3',
      }
    )
    expect(curryCommandCreator).toHaveBeenCalledWith(dropTipInPlace, {
      pipetteId: mockId,
    })
  })
  it('returns correct commands for aspirate in place (air gap)', () => {
    airGapInMovableTrash({
      ...args,
      prevRobotState: {
        ...args.prevRobotState,
        tipState: { pipettes: { [mockId]: true } } as any,
      },
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
