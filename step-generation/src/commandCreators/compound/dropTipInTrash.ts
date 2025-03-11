import {
  getTrashBinAddressableAreaName,
  curryCommandCreator,
  reduceCommandCreators,
} from '../../utils'
import { moveToAddressableAreaForDropTip } from '../atomic/moveToAddressableAreaForDropTip'
import { dropTipInPlace } from '../atomic/dropTipInPlace'
import type { CurriedCommandCreator, CommandCreator } from '../../types'
import type { DropTipInPlaceParams } from '@opentrons/shared-data'

export const dropTipInTrash: CommandCreator<DropTipInPlaceParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId } = args
  let commandCreators: CurriedCommandCreator[] = []
  const addressableAreaName = getTrashBinAddressableAreaName(
    invariantContext.additionalEquipmentEntities
  )
  if (addressableAreaName == null) {
    console.error('could not getTrashBinAddressableAreaName for dropTip')
  } else if (prevRobotState.tipState.pipettes[pipetteId]) {
    commandCreators = [
      curryCommandCreator(moveToAddressableAreaForDropTip, {
        pipetteId,
        addressableAreaName,
      }),
      curryCommandCreator(dropTipInPlace, {
        pipetteId,
      }),
      // TODO:
      // CommandCreator to emit Python pipette.drop_tip() would go here
    ]
  }

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
