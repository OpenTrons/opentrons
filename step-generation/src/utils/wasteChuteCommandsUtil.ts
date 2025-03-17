import { ZERO_OFFSET } from '../constants'
import { moveToAddressableArea } from '../commandCreators'
import {
  airGapInPlace,
  blowOutInPlace,
  dispenseInPlace,
  prepareToAspirate,
} from '../commandCreators/atomic'
import { curryCommandCreator } from './curryCommandCreator'
import { getWasteChuteAddressableAreaNamePip } from './misc'
import type { CurriedCommandCreator, InvariantContext } from '../types'

interface WasteChuteCommandArgs {
  pipetteId: string
  invariantContext: InvariantContext
  volume?: number
  flowRate?: number
}

export const dispenseInWasteChute = (
  args: WasteChuteCommandArgs
): CurriedCommandCreator[] => {
  const { pipetteId, invariantContext, flowRate, volume } = args
  const pipetteChannels =
    invariantContext.pipetteEntities[pipetteId].spec.channels
  const addressableAreaName = getWasteChuteAddressableAreaNamePip(
    pipetteChannels
  )

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
  const { pipetteId, invariantContext, flowRate } = args
  const pipetteChannels =
    invariantContext.pipetteEntities[pipetteId].spec.channels
  const addressableAreaName = getWasteChuteAddressableAreaNamePip(
    pipetteChannels
  )

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
  const { pipetteId, invariantContext, volume, flowRate } = args
  const pipetteChannels =
    invariantContext.pipetteEntities[pipetteId].spec.channels
  const addressableAreaName = getWasteChuteAddressableAreaNamePip(
    pipetteChannels
  )

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
