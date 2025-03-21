import {
  curryCommandCreator,
  curryWithoutPython,
  getWasteChuteAddressableAreaNamePip,
  reduceCommandCreators,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { blowOutInPlace, moveToAddressableArea } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

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
  const pipetteChannels = pipetteEntities[pipetteId].spec.channels
  const addressableAreaName = getWasteChuteAddressableAreaNamePip(
    pipetteChannels
  )
  const pipettePythonName = pipetteEntities[pipetteId].pythonName
  const wasteChutePythonName =
    additionalEquipmentEntities[wasteChuteId].pythonName

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
      addressableAreaName,
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
