import { formatPyStr, uuid } from '../../utils'
import { noTipOnPipette, pipetteDoesNotExist } from '../../errorCreators'
import type { CreateCommand, TouchTipParams } from '@opentrons/shared-data'
import type { CommandCreator, CommandCreatorError } from '../../types'

interface TouchTipAtomicParams extends Omit<TouchTipParams, 'wellLocation'> {
  zOffsetFromTop: number
}

export const touchTip: CommandCreator<TouchTipAtomicParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /** touchTip with given args. Requires tip. */
  const actionName = 'touchTip'
  const {
    pipetteId,
    labwareId,
    wellName,
    zOffsetFromTop,
    speed,
    mmFromEdge,
  } = args
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
    `${labwarePythonName}[${formatPyStr(wellName)}]`,
    `v_offset=${zOffsetFromTop}`,
    ...(speed != null ? [`speed=${speed}`] : []),
    ...(mmFromEdge != null ? [`mm_from_edge=${mmFromEdge}`] : []),
  ]

  //  TODO: add mmFromEdge to python and commandCreator
  const python = `${pipettePythonName}.touch_tip(${pythonArgs.join(', ')})`

  const commands: CreateCommand[] = [
    {
      commandType: 'touchTip',
      key: uuid(),
      params: {
        pipetteId,
        labwareId,
        wellName,
        wellLocation: {
          origin: 'top',
          offset: {
            z: zOffsetFromTop,
          },
        },
        speed,
        mmFromEdge,
      },
    },
  ]
  return {
    commands,
    python,
  }
}
