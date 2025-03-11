import {
  aspirateInPlace,
  blowOutInPlace,
  dispenseInPlace,
  dropTipInPlace,
  moveToAddressableArea,
  moveToAddressableAreaForDropTip,
} from '../commandCreators/atomic'
import { ZERO_OFFSET } from '../constants'
import { curryCommandCreator } from './curryCommandCreator'
import { getTrashBinAddressableAreaName } from './misc'
import type {
  RobotState,
  InvariantContext,
  CurriedCommandCreator,
} from '../types'

/** Helper fn for movable trash commands for dispense, aspirate, air_gap, drop_tip and blow_out commands */

export function airGapInMovableTrash(args: {
  pipetteId: string
  volume: number
  flowRate: number
  invariantContext: InvariantContext
  prevRobotState: RobotState
}): CurriedCommandCreator[] {
  const { pipetteId, invariantContext, volume, flowRate } = args
  const offset = ZERO_OFFSET
  const addressableAreaName = getTrashBinAddressableAreaName(
    invariantContext.additionalEquipmentEntities
  )
  if (addressableAreaName == null) {
    console.error('could not getTrashBinAddressableAreaName for airGap')
    return []
  }
  return [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
      offset,
    }),
    curryCommandCreator(aspirateInPlace, {
      pipetteId,
      volume,
      flowRate,
    }),
  ]
}

export function dropTipInMovableTrash(args: {
  pipetteId: string
  invariantContext: InvariantContext
  prevRobotState: RobotState
}): CurriedCommandCreator[] {
  const { pipetteId, invariantContext, prevRobotState } = args
  const addressableAreaName = getTrashBinAddressableAreaName(
    invariantContext.additionalEquipmentEntities
  )
  if (addressableAreaName == null) {
    console.error('could not getTrashBinAddressableAreaName for dropTip')
    return []
  }
  if (!prevRobotState.tipState.pipettes[pipetteId]) {
    return []
  }
  return [
    curryCommandCreator(moveToAddressableAreaForDropTip, {
      pipetteId,
      addressableAreaName,
    }),
    curryCommandCreator(dropTipInPlace, {
      pipetteId,
    }),
  ]
}

export function dispenseInMovableTrash(args: {
  pipetteId: string
  volume: number
  flowRate: number
  invariantContext: InvariantContext
  prevRobotState: RobotState
}): CurriedCommandCreator[] {
  const { pipetteId, invariantContext, volume, flowRate } = args
  const offset = ZERO_OFFSET
  const addressableAreaName = getTrashBinAddressableAreaName(
    invariantContext.additionalEquipmentEntities
  )
  if (addressableAreaName == null) {
    console.error('could not getTrashBinAddressableAreaName for dispense')
    return []
  }
  return [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
      offset,
    }),
    curryCommandCreator(dispenseInPlace, {
      pipetteId,
      volume,
      flowRate,
    }),
  ]
}

export function blowOutInMovableTrash(args: {
  pipetteId: string
  flowRate: number
  invariantContext: InvariantContext
  prevRobotState: RobotState
}): CurriedCommandCreator[] {
  const { pipetteId, invariantContext, flowRate } = args
  const offset = ZERO_OFFSET
  const addressableAreaName = getTrashBinAddressableAreaName(
    invariantContext.additionalEquipmentEntities
  )
  if (addressableAreaName == null) {
    console.error('could not getTrashBinAddressableAreaName for blowOut')
    return []
  }
  return [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
      offset,
    }),
    curryCommandCreator(blowOutInPlace, {
      pipetteId,
      flowRate,
    }),
  ]
}

export function moveToMovableTrash(args: {
  pipetteId: string
  invariantContext: InvariantContext
  prevRobotState: RobotState
}): CurriedCommandCreator[] {
  const { pipetteId, invariantContext } = args
  const offset = ZERO_OFFSET
  const addressableAreaName = getTrashBinAddressableAreaName(
    invariantContext.additionalEquipmentEntities
  )
  if (addressableAreaName == null) {
    console.error('could not getTrashBinAddressableAreaName for moveTo')
    return []
  }
  return [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
      offset,
    }),
  ]
}
