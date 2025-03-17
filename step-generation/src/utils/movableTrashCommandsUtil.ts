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
import type { CurriedCommandCreator } from '../types'

/** Helper fn for movable trash commands for dispense, aspirate, air_gap, drop_tip and blow_out commands */

export function airGapInMovableTrash(args: {
  pipetteId: string
  volume: number
  flowRate: number
  trashLocation: CutoutId
}): CurriedCommandCreator[] {
  const { pipetteId, trashLocation, volume, flowRate } = args
  const offset = ZERO_OFFSET
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
  trashLocation: CutoutId
}): CurriedCommandCreator[] {
  const { pipetteId, trashLocation, volume, flowRate } = args
  const offset = ZERO_OFFSET
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
  trashLocation: CutoutId
}): CurriedCommandCreator[] {
  const { pipetteId, trashLocation, flowRate } = args
  const offset = ZERO_OFFSET
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
  trashLocation: CutoutId
}): CurriedCommandCreator[] {
  const { pipetteId, trashLocation } = args
  const offset = ZERO_OFFSET
  const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)

  return [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
      offset,
    }),
  ]
}
