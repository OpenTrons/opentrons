import {
  getTrashBinAddressableAreaName,
  reduceCommandCreators,
  curryWithoutPython,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { blowOutInPlace, moveToAddressableArea } from '../atomic'
import type { CurriedCommandCreator, CommandCreator } from '../../types'
import type { CutoutId } from '@opentrons/shared-data'

interface BlowOutInTrashParams {
  pipetteId: string
  flowRate: number
  trashId: string
}
export const blowOutInTrash: CommandCreator<BlowOutInTrashParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, trashId, flowRate } = args
  const { pipetteEntities, additionalEquipmentEntities } = invariantContext
  const trashEntity = additionalEquipmentEntities[trashId]
  const addressableAreaName = getTrashBinAddressableAreaName(
    trashEntity.location as CutoutId
  )
  const pipettePythonName = pipetteEntities[pipetteId].pythonName
  const trashPythonName = trashEntity.pythonName

  const pythonCommandCreator: CurriedCommandCreator = () => ({
    commands: [],
    python:
      `${pipettePythonName}.flow_rate.blow_out = ${flowRate}\n` +
      `${pipettePythonName}.blow_out(${trashPythonName})`,
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
