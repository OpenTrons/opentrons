import {
  getTrashBinAddressableAreaName,
  reduceCommandCreators,
  curryWithoutPython,
} from '../../utils'
import { moveToAddressableAreaForDropTip } from '../atomic/moveToAddressableAreaForDropTip'
import { dropTipInPlace } from '../atomic/dropTipInPlace'
import type { CurriedCommandCreator, CommandCreator } from '../../types'
import type { CutoutId, DropTipInPlaceParams } from '@opentrons/shared-data'

interface DropTipInTrashParams extends DropTipInPlaceParams {
  trashLocation: CutoutId
}
export const dropTipInTrash: CommandCreator<DropTipInTrashParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, trashLocation } = args
  let commandCreators: CurriedCommandCreator[] = []
  const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)

  if (prevRobotState.tipState.pipettes[pipetteId]) {
    const pipettePythonName =
      invariantContext.pipetteEntities[pipetteId].pythonName
    const pythonCommandCreator: CurriedCommandCreator = () => ({
      commands: [],
      // This is tricky and subtle: When dropping tips into the trash bin, we always
      // want to alternateDropLocation. However, the Python drop_tip() only alternates
      // the drop location if you do NOT specify a location= argument, in which case
      // drop_tip() drops into the default trash container for the pipette.
      // PD only allows a single trash bin, so we don't need to worry about emitting
      // location= to select among multiple trash bins.
      // But we DO need to worry about the possibility that the waste chute might be
      // the default trash container if we have both a waste chute and a trash bin. The
      // API specifies that the default trash container is whichever was loaded first.
      // Our code generator does load the trash bin before loading the waste chute,
      // so this works for now, but it's very brittle.
      python: `${pipettePythonName}.drop_tip()`,
    })

    commandCreators = [
      curryWithoutPython(moveToAddressableAreaForDropTip, {
        pipetteId,
        addressableAreaName,
      }),
      curryWithoutPython(dropTipInPlace, {
        pipetteId,
      }),
      pythonCommandCreator,
    ]
  }

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
