import {
  curryWithoutPython,
  indentPyLines,
  reduceCommandCreators,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { dispenseInPlace, moveToAddressableArea } from '../atomic'
import type {
  CommandCreator,
  CurriedCommandCreator,
  WasteChuteEntity,
} from '../../types'

interface DispenseInWasteChuteArgs {
  pipetteId: string
  flowRate: number
  volume: number
  wasteChuteId: string
}

export const dispenseInWasteChute: CommandCreator<DispenseInWasteChuteArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, flowRate, volume, wasteChuteId } = args
  const { pipetteEntities, additionalEquipmentEntities } = invariantContext
  const wasteChuteEntity = additionalEquipmentEntities[
    wasteChuteId
  ] as WasteChuteEntity
  const wasteChutePythonName = wasteChuteEntity.pythonName
  const pipettePythonName = pipetteEntities[pipetteId].pythonName
  const pythonArgs = [
    `volume=${volume}`,
    `location=${wasteChutePythonName}`,
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
      fixtureId: wasteChuteId,
      offset: ZERO_OFFSET,
    }),
    curryWithoutPython(dispenseInPlace, {
      pipetteId,
      flowRate,
      volume,
    }),
    pythonCommandCreator,
  ]

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
