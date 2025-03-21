import { curryWithoutPython, reduceCommandCreators } from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { dropTipInPlace, moveToAddressableArea } from '../atomic'
import type {
  CommandCreator,
  CurriedCommandCreator,
  WasteChuteEntity,
} from '../../types'

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

  let commandCreators: CurriedCommandCreator[] = []

  // No-op if there is no tip
  if (!prevRobotState.tipState.pipettes[pipetteId]) {
    commandCreators = []
  } else {
    const pipettePythonName = pipetteEntities[pipetteId].pythonName
    const wasteChuteEntity = additionalEquipmentEntities[
      wasteChuteId
    ] as WasteChuteEntity
    const wasteChutePythonName = wasteChuteEntity.pythonName
    const pythonCommandCreator: CurriedCommandCreator = () => ({
      commands: [],
      python: `${pipettePythonName}.drop_tip(${wasteChutePythonName})`,
    })

    commandCreators = [
      curryWithoutPython(moveToAddressableArea, {
        pipetteId,
        fixtureId: wasteChuteId,
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
