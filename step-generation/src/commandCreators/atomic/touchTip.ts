import { uuid } from '../../utils'
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
  const {
    pipetteId,
    labwareId,
    wellName,
    wellLocation,
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
        mmFromEdge,
      },
    },
  ]
  return {
    commands,
  }
}
