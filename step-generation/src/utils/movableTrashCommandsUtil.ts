import {
  airGapInPlace,
  blowOutInPlace,
  dispenseInPlace,
  moveToAddressableArea,
  prepareToAspirate,
} from '../commandCreators/atomic'
import { ZERO_OFFSET } from '../constants'
import { curryCommandCreator } from './curryCommandCreator'
import { getTrashBinAddressableAreaName } from './misc'
import type { CutoutId } from '@opentrons/shared-data'
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
  const trash = Object.values(
    invariantContext.additionalEquipmentEntities
  ).find(aE => aE.name === 'trashBin')
  const trashLocation = trash?.location as CutoutId

  if (trashLocation == null) {
    console.error(
      `could not find trashLocation in airGapInMovableTrash with entity ${trash?.name}`
    )
    return []
  }

  const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)

  return [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
      offset,
    }),
    curryCommandCreator(prepareToAspirate, {
      pipetteId,
    }),
    curryCommandCreator(airGapInPlace, {
      pipetteId,
      volume,
      flowRate,
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
  const trash = Object.values(
    invariantContext.additionalEquipmentEntities
  ).find(aE => aE.name === 'trashBin')
  const trashLocation = trash?.location as CutoutId

  if (trashLocation == null) {
    console.error(`could not find trashLocation with entity ${trash?.name}`)
    return []
  }

  const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)

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
  const trash = Object.values(
    invariantContext.additionalEquipmentEntities
  ).find(aE => aE.name === 'trashBin')
  const trashLocation = trash?.location as CutoutId

  if (trashLocation == null) {
    console.error(
      `could not find trashLocation in blowOutInMovableTrash with entity ${trash?.name}`
    )
    return []
  }

  const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)

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
  const trash = Object.values(
    invariantContext.additionalEquipmentEntities
  ).find(aE => aE.name === 'trashBin')
  const trashLocation = trash?.location as CutoutId

  if (trashLocation == null) {
    console.error(
      `could not find trashLocation in moveToMovableTrash with entity ${trash?.name}`
    )
    return []
  }

  const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)

  return [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
      offset,
    }),
  ]
}
