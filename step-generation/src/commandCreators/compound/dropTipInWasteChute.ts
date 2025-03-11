import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { dropTipInPlace, moveToAddressableArea } from '../atomic'
import type { AddressableAreaName } from '@opentrons/shared-data'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface DropTipInWasteChuteArgs {
  pipetteId: string
  addressableAreaName: AddressableAreaName
}

export const dropTipInWasteChute: CommandCreator<DropTipInWasteChuteArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const offset = ZERO_OFFSET

  const { pipetteId, addressableAreaName } = args

  let commandCreators: CurriedCommandCreator[] = []

  // No-op if there is no tip
  if (!prevRobotState.tipState.pipettes[pipetteId]) {
    commandCreators = []
  }

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
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
