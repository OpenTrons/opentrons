import { ZERO_OFFSET } from '../constants'
import { dropTipInWasteChute, moveToAddressableArea } from '../commandCreators'
import {
  airGapInPlace,
  blowOutInPlace,
  dispenseInPlace,
  prepareToAspirate,
} from '../commandCreators/atomic'
import { curryCommandCreator } from './curryCommandCreator'
import type { AddressableAreaName } from '@opentrons/shared-data'
import type { CurriedCommandCreator } from '../types'

export type WasteChuteCommandsTypes =
  | 'dispense'
  | 'blowOut'
  | 'dropTip'
  | 'airGap'

interface WasteChuteCommandArgs {
  type: WasteChuteCommandsTypes
  pipetteId: string
  addressableAreaName: AddressableAreaName
  volume?: number
  flowRate?: number
}
/** Helper fn for waste chute dispense, drop tip, air_gap, and blow_out commands */
export const wasteChuteCommandsUtil = (
  args: WasteChuteCommandArgs
): CurriedCommandCreator[] => {
  const offset = ZERO_OFFSET
  const { pipetteId, addressableAreaName, type, volume, flowRate } = args
  let commands: CurriedCommandCreator[] = []
  switch (type) {
    case 'dropTip': {
      commands = [
        curryCommandCreator(dropTipInWasteChute, {
          pipetteId,
          addressableAreaName,
        }),
      ]

      break
    }
    case 'dispense': {
      commands =
        flowRate != null && volume != null
          ? [
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
          : []
      break
    }
    case 'blowOut': {
      commands =
        flowRate != null
          ? [
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
          : []
      break
    }
    case 'airGap': {
      commands =
        flowRate != null && volume != null
          ? [
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
                flowRate,
                volume,
              }),
            ]
          : []
      break
    }
  }

  return commands
}
