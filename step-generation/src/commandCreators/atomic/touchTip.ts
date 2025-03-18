import { formatPyStr, indentPyLines, uuid } from '../../utils'
import { noTipOnPipette, pipetteDoesNotExist } from '../../errorCreators'
import type {
  CreateCommand,
  TouchTipParams,
  WellOrigin,
} from '@opentrons/shared-data'
import type { CommandCreator, CommandCreatorError } from '../../types'

interface TouchTipAtomicParams extends Omit<TouchTipParams, 'wellLocation'> {
  zOffset: number
  origin: WellOrigin
}

export const touchTip: CommandCreator<TouchTipAtomicParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /** touchTip with given args. Requires tip. */
  const actionName = 'touchTip'
  const { pipetteId, labwareId, wellName, zOffset, origin, speed } = args
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

  const pythonArgs = [
    `${labwarePythonName}[${formatPyStr(wellName)}],`,
    `v_offset=${zOffset}`,
    ...(speed != null ? [`speed=${speed},`] : []),
  ]

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
        wellLocation: {
          origin,
          offset: {
            z: zOffset,
          },
        },
        speed,
      },
    },
  ]
  return {
    commands,
    python,
  }
}
