import { formatPyStr, indentPyLines, uuid } from '../../utils'
import { noTipOnPipette, pipetteDoesNotExist } from '../../errorCreators'
import type { CreateCommand, TouchTipParams } from '@opentrons/shared-data'
import type { CommandCreator, CommandCreatorError } from '../../types'

export const touchTip: CommandCreator<TouchTipParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /** touchTip with given args. Requires tip. */
  const actionName = 'touchTip'
  const { pipetteId, labwareId, wellName, wellLocation, speed } = args
  const pipetteData = prevRobotState.pipettes[pipetteId]
  const errors: CommandCreatorError[] = []

  if (!pipetteData) {
    errors.push(
      pipetteDoesNotExist({
        pipette: pipetteId,
      })
    )
  }

  if (!prevRobotState.tipState.pipettes[pipetteId]) {
    errors.push(
      noTipOnPipette({
        actionName,
        pipette: pipetteId,
        labware: labwareId,
        well: wellName,
      })
    )
  }

  if (errors.length > 0) {
    return {
      errors,
    }
  }

  const pipettePythonName =
    invariantContext.pipetteEntities[pipetteId].pythonName
  const labwarePythonName =
    invariantContext.labwareEntities[labwareId].pythonName
  const pythonOffset =
    wellLocation?.offset?.z != null
      ? `v_offset=${wellLocation?.offset?.z},`
      : null
  const pythonSpeed = speed != null ? `speed=${speed},` : null
  const pythonArgs = [
    `${labwarePythonName}[${formatPyStr(wellName)}],`,
    pythonOffset,
    pythonSpeed,
  ].filter(arg => arg != null)

  //  TODO: add mmFromEdge to python and commandCreator
  const python = `${pipettePythonName}.touch_tip(\n${indentPyLines(
    pythonArgs.join('\n')
  )}\n)`

  const commands: CreateCommand[] = [
    {
      commandType: 'touchTip',
      key: uuid(),
      params: {
        pipetteId,
        labwareId,
        wellName,
        wellLocation,
        speed,
      },
    },
  ]
  return {
    commands,
    python,
  }
}
