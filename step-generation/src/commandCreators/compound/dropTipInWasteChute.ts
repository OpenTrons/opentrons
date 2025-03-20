import {
  curryWithoutPython,
  getWasteChuteAddressableAreaNamePip,
  reduceCommandCreators,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { dropTipInPlace, moveToAddressableArea } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface DropTipInWasteChuteArgs {
  pipetteId: string
  wasteChuteId: string
}

export const dropTipInWasteChute: CommandCreator<DropTipInWasteChuteArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const offset = ZERO_OFFSET
  const { pipetteId, wasteChuteId } = args
  const { pipetteEntities, additionalEquipmentEntities } = invariantContext
  const pipetteChannels = pipetteEntities[pipetteId].spec.channels
  const addressableAreaName = getWasteChuteAddressableAreaNamePip(
    pipetteChannels
  )
  const hasTrashBin =
    Object.values(additionalEquipmentEntities).find(
      ae => ae.name === 'trashBin'
    ) != null

  let commandCreators: CurriedCommandCreator[] = []

  // No-op if there is no tip
  if (!prevRobotState.tipState.pipettes[pipetteId]) {
    commandCreators = []
  } else {
    const pipettePythonName = pipetteEntities[pipetteId].pythonName
    const wasteChutePythonName =
      additionalEquipmentEntities[wasteChuteId].pythonName
    //  if there is no trash bin selected, drop tip will occur at the default
    //  trash container, which would be the waste_chute since we do not support
    //  having no trash container in PD. Since our code generator always generates
    //  the trash bins first, if a trash bin exists, we will have to provide the
    //  waste chute location.
    const pythonLocation = hasTrashBin ? [wasteChutePythonName] : []
    const pythonCommandCreator: CurriedCommandCreator = () => ({
      commands: [],
      python: `${pipettePythonName}.drop_tip(${pythonLocation})`,
    })

    commandCreators = [
      curryWithoutPython(moveToAddressableArea, {
        pipetteId,
        addressableAreaName,
        offset,
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
