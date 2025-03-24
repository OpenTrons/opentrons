import { reduceCommandCreators, curryWithoutPython } from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { blowOutInPlace, moveToAddressableArea } from '../atomic'
import type { CurriedCommandCreator, CommandCreator } from '../../types'

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
  const { pipetteEntities, trashBinEntities } = invariantContext
  const pipettePythonName = pipetteEntities[pipetteId].pythonName
  const trashPythonName = trashBinEntities[trashId].pythonName

  const pythonCommandCreator: CurriedCommandCreator = () => ({
    commands: [],
    python:
      // The Python blow_out() does not take a flow rate argument, so we have to
      // reconfigure the pipette's default blow out rate instead:
      `${pipettePythonName}.flow_rate.blow_out = ${flowRate}\n` +
      `${pipettePythonName}.blow_out(${trashPythonName})`,
  })
  const commandCreators = [
    curryWithoutPython(moveToAddressableArea, {
      pipetteId,
      fixtureId: trashId,
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
