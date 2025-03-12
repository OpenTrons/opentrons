import { ZERO_OFFSET } from '../constants'
import { moveToAddressableArea } from '../commandCreators'
import {
  airGapInPlace,
  blowOutInPlace,
  dispenseInPlace,
  prepareToAspirate,
} from '../commandCreators/atomic'
import { curryCommandCreator } from './curryCommandCreator'
import type { AddressableAreaName } from '@opentrons/shared-data'
import type { CurriedCommandCreator } from '../types'

interface WasteChuteCommandArgs {
  pipetteId: string
  addressableAreaName: AddressableAreaName
  volume?: number
  flowRate?: number
}

export const dispenseInWasteChute = (
  args: WasteChuteCommandArgs
): CurriedCommandCreator[] => {
  const { pipetteId, addressableAreaName, flowRate, volume } = args

  return flowRate != null && volume != null
    ? [
        curryCommandCreator(moveToAddressableArea, {
          pipetteId,
          addressableAreaName,
          offset: ZERO_OFFSET,
        }),
        curryCommandCreator(dispenseInPlace, {
          pipetteId,
          volume,
          flowRate,
        }),
      ]
    : []
}

export const blowoutInWasteChute = (
  args: WasteChuteCommandArgs
): CurriedCommandCreator[] => {
  const { pipetteId, addressableAreaName, flowRate } = args

  return flowRate != null
    ? [
        curryCommandCreator(moveToAddressableArea, {
          pipetteId,
          addressableAreaName,
          offset: ZERO_OFFSET,
        }),
        curryCommandCreator(blowOutInPlace, {
          pipetteId,
          flowRate,
        }),
      ]
    : []
}

export const airGapInWasteChute = (
  args: WasteChuteCommandArgs
): CurriedCommandCreator[] => {
  const { pipetteId, addressableAreaName, volume, flowRate } = args

  return flowRate != null && volume != null
    ? [
        curryCommandCreator(moveToAddressableArea, {
          pipetteId,
          addressableAreaName,
          offset: ZERO_OFFSET,
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
}
