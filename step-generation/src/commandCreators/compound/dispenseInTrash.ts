import {
  reduceCommandCreators,
  indentPyLines,
  curryWithoutPython,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { dispenseInPlace, moveToAddressableArea } from '../atomic'
import type { CurriedCommandCreator, CommandCreator } from '../../types'

interface DispenseInTrashParams {
  pipetteId: string
  flowRate: number
  volume: number
  trashId: string
}
export const dispenseInTrash: CommandCreator<DispenseInTrashParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, trashId, flowRate, volume } = args
  const { pipetteEntities, additionalEquipmentEntities } = invariantContext
  const trashEntity = additionalEquipmentEntities[trashId]
  const pipettePythonName = pipetteEntities[pipetteId].pythonName
  const trashPythonName = trashEntity.pythonName
  const pythonArgs = [
    `volume=${volume}`,
    `location=${trashPythonName}`,
    // rate= is a ratio in the PAPI, and we have no good way to figure out what
    // flowrate the PAPI has set the pipette to, so we just have to emit a division:
    `rate=${flowRate} / ${pipettePythonName}.flow_rate.dispense`,
  ]

  const pythonCommandCreator: CurriedCommandCreator = () => ({
    commands: [],
    python: `${pipettePythonName}.dispense(\n${indentPyLines(
      pythonArgs.join(',\n')
    )},\n)`,
  })

  const commandCreators = [
    curryWithoutPython(moveToAddressableArea, {
      pipetteId,
      fixtureId: trashId,
      offset: ZERO_OFFSET,
    }),
    curryWithoutPython(dispenseInPlace, {
      pipetteId,
      volume,
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
