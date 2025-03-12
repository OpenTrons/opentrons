import {
  airGapInPlace,
  blowOutInPlace,
  dispenseInPlace,
  dropTipInPlace,
  moveToAddressableArea,
  prepareToAspirate,
} from '../commandCreators/atomic'
import { ZERO_OFFSET } from '../constants'
import { curryCommandCreator } from './curryCommandCreator'
import type { AddressableAreaName } from '@opentrons/shared-data'
import type { RobotState, CurriedCommandCreator } from '../types'

export type WasteChuteCommandsTypes =
  | 'dispense'
  | 'blowOut'
  | 'dropTip'
  | 'airGap'

interface WasteChuteCommandArgs {
  type: WasteChuteCommandsTypes
  pipetteId: string
  addressableAreaName: AddressableAreaName
  prevRobotState: RobotState
  volume?: number
  flowRate?: number
}
/** Helper fn for waste chute dispense, drop tip and blow_out commands */
export const wasteChuteCommandsUtil = (
  args: WasteChuteCommandArgs
): CurriedCommandCreator[] => {
  const {
    pipetteId,
    addressableAreaName,
    type,
    prevRobotState,
    volume,
    flowRate,
  } = args
  const offset = ZERO_OFFSET
  let commands: CurriedCommandCreator[] = []
  switch (type) {
    case 'dropTip': {
      commands = !prevRobotState.tipState.pipettes[pipetteId]
        ? []
        : [
            curryCommandCreator(moveToAddressableArea, {
              pipetteId,
              addressableAreaName,
              offset,
            }),
            curryCommandCreator(dropTipInPlace, {
              pipetteId,
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
