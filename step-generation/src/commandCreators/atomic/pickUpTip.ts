import { ALL, SINGLE } from '@opentrons/shared-data'
import {
  pipettingIntoColumn4,
  possiblePipetteCollision,
} from '../../errorCreators'
import { COLUMN_4_SLOTS } from '../../constants'
import { uuid, getIsSafePipetteMovement } from '../../utils'
import type {
  NozzleConfigurationStyle,
  PickUpTipParams,
} from '@opentrons/shared-data'
import type { CommandCreator, CommandCreatorError } from '../../types'

interface PickUpTipAtomicParams extends PickUpTipParams {
  nozzles?: NozzleConfigurationStyle
}

export const pickUpTip: CommandCreator<PickUpTipAtomicParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, labwareId, wellName, nozzles } = args
  const errors: CommandCreatorError[] = []

  const pipChannels = invariantContext.pipetteEntities[pipetteId]?.spec.channels
  const is96Channel = pipChannels === 96
  const is8Channel = pipChannels === 8

  if (
    ((is96Channel && nozzles !== ALL) || (is8Channel && nozzles === SINGLE)) &&
    !getIsSafePipetteMovement(
      args.nozzles ?? null,
      prevRobotState,
      invariantContext,
      pipetteId,
      labwareId,
      labwareId,
      //  we don't adjust the offset when moving to the tiprack
      { x: 0, y: 0 },
      wellName
    )
  ) {
    errors.push(possiblePipetteCollision())
  }

  const tiprackSlot = prevRobotState.labware[labwareId].slot
  if (COLUMN_4_SLOTS.includes(tiprackSlot)) {
    errors.push(pipettingIntoColumn4({ typeOfStep: 'pick up tip' }))
  } else if (prevRobotState.labware[tiprackSlot] != null) {
    const adapterSlot = prevRobotState.labware[tiprackSlot].slot
    if (COLUMN_4_SLOTS.includes(adapterSlot)) {
      errors.push(pipettingIntoColumn4({ typeOfStep: 'pick up tip' }))
    }
  }

  const pipettePythonName =
    invariantContext.pipetteEntities[pipetteId].pythonName
  const tiprackPythonName =
    invariantContext.labwareEntities[labwareId].pythonName
  // We don't specify the tip well because it would make it hard for users to modify
  // the Python protocol. We do specify the tip rack because multiple tip racks could be
  // assigned to the pipette, and the UI makes the user choose which tip rack to use.
  const python = `${pipettePythonName}.pick_up_tip(location=${tiprackPythonName})`

  if (errors.length > 0) {
    return { errors }
  }
  return {
    commands: [
      {
        commandType: 'pickUpTip',
        key: uuid(),
        params: {
          pipetteId,
          labwareId,
          wellName,
        },
      },
    ],
    python,
  }
}
