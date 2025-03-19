import {
  curryCommandCreator,
  getWasteChuteAddressableAreaNamePip,
  reduceCommandCreators,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { dropTipInPlace, moveToAddressableArea } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface DropTipInWasteChuteArgs {
  pipetteId: string
}

export const dropTipInWasteChute: CommandCreator<DropTipInWasteChuteArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const offset = ZERO_OFFSET
  const { pipetteId } = args
  const pipetteChannels =
    invariantContext.pipetteEntities[pipetteId].spec.channels
  const addressableAreaName = getWasteChuteAddressableAreaNamePip(
    pipetteChannels
  )

  let commandCreators: CurriedCommandCreator[] = []

  // No-op if there is no tip
  if (!prevRobotState.tipState.pipettes[pipetteId]) {
    commandCreators = []
  } else {
    commandCreators = [
      curryCommandCreator(moveToAddressableArea, {
        pipetteId,
        addressableAreaName,
        offset,
      }),
      curryCommandCreator(dropTipInPlace, {
        pipetteId,
      }),
    ]
  }
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
