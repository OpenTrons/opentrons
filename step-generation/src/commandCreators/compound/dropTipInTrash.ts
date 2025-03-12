import {
  getTrashBinAddressableAreaName,
  curryCommandCreator,
  reduceCommandCreators,
} from '../../utils'
import { moveToAddressableAreaForDropTip } from '../atomic/moveToAddressableAreaForDropTip'
import { dropTipInPlace } from '../atomic/dropTipInPlace'
import type { CurriedCommandCreator, CommandCreator } from '../../types'
import type { CutoutId, DropTipInPlaceParams } from '@opentrons/shared-data'

export const dropTipInTrash: CommandCreator<DropTipInPlaceParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId } = args
  let commandCreators: CurriedCommandCreator[] = []
  const trash = Object.values(
    invariantContext.additionalEquipmentEntities
  ).find(aE => aE.name === 'trashBin')
  const trashLocation = trash?.location as CutoutId

  if (trashLocation == null) {
    console.error(
      `could not find trashLocation in dropTipInTrash with entity ${trash?.name}`
    )
  } else if (prevRobotState.tipState.pipettes[pipetteId]) {
    const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)

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
