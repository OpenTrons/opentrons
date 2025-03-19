import {
  curryCommandCreator,
  getWasteChuteAddressableAreaNamePip,
  reduceCommandCreators,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { blowOutInPlace, moveToAddressableArea } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface BlowOutInWasteChuteArgs {
  pipetteId: string
  flowRate: number
}

export const blowOutInWasteChute: CommandCreator<BlowOutInWasteChuteArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, flowRate } = args
  const pipetteChannels =
    invariantContext.pipetteEntities[pipetteId].spec.channels
  const addressableAreaName = getWasteChuteAddressableAreaNamePip(
    pipetteChannels
  )

  const commandCreators: CurriedCommandCreator[] = [
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

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
