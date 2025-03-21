import {
  curryCommandCreator,
  getWasteChuteAddressableAreaNamePip,
  reduceCommandCreators,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { delay, moveToAddressableArea } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface delayInWasteChuteArgs {
  pipetteId: string
  seconds: number
}

export const delayInWasteChute: CommandCreator<delayInWasteChuteArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { seconds, pipetteId } = args
  const pipetteChannels =
    invariantContext.pipetteEntities[pipetteId].spec.channels

  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName: getWasteChuteAddressableAreaNamePip(pipetteChannels),
      offset: ZERO_OFFSET,
    }),
    curryCommandCreator(delay, {
      seconds: seconds,
    }),
  ]

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
