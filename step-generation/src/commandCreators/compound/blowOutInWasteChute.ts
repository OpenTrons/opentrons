import { curryWithoutPython, reduceCommandCreators } from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { blowOutInPlace, moveToAddressableArea } from '../atomic'
import type {
  CommandCreator,
  CurriedCommandCreator,
  WasteChuteEntity,
} from '../../types'

interface BlowOutInWasteChuteArgs {
  pipetteId: string
  flowRate: number
  wasteChuteId: string
}

export const blowOutInWasteChute: CommandCreator<BlowOutInWasteChuteArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, flowRate, wasteChuteId } = args
  const { pipetteEntities, additionalEquipmentEntities } = invariantContext
  const pipettePythonName = pipetteEntities[pipetteId].pythonName
  const wasteChuteEntity = additionalEquipmentEntities[
    wasteChuteId
  ] as WasteChuteEntity
  const wasteChutePythonName = wasteChuteEntity.pythonName

  const pythonCommandCreator: CurriedCommandCreator = () => ({
    commands: [],
    python:
      // The Python blow_out() does not take a flow rate argument, so we have to
      // reconfigure the pipette's default blow out rate instead:
      `${pipettePythonName}.flow_rate.blow_out = ${flowRate}\n` +
      `${pipettePythonName}.blow_out(${wasteChutePythonName})`,
  })
  const commandCreators = [
    curryWithoutPython(moveToAddressableArea, {
      pipetteId,
      fixtureId: wasteChuteId,
      offset: ZERO_OFFSET,
    }),
    curryWithoutPython(blowOutInPlace, {
      pipetteId,
      flowRate,
    }),
    pythonCommandCreator,
  ]

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
