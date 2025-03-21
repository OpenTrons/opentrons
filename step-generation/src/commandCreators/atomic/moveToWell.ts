import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import * as errorCreators from '../../errorCreators'
import {
  absorbanceReaderCollision,
  modulePipetteCollision,
  thermocyclerPipetteCollision,
  pipetteIntoHeaterShakerLatchOpen,
  pipetteIntoHeaterShakerWhileShaking,
  getIsHeaterShakerEastWestWithLatchOpen,
  pipetteAdjacentHeaterShakerWhileShaking,
  getLabwareSlot,
  getIsHeaterShakerEastWestMultiChannelPipette,
  getIsHeaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette,
  uuid,
  formatPyStr,
  formatPyWellLocation,
} from '../../utils'
import { COLUMN_4_SLOTS } from '../../constants'
import type { CreateCommand, MoveToWellParams } from '@opentrons/shared-data'
import type { CommandCreator, CommandCreatorError } from '../../types'

/** Move to specified well of labware, with optional offset and pathing options. */
export const moveToWell: CommandCreator<MoveToWellParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const {
    pipetteId,
    labwareId,
    wellName,
    wellLocation,
    minimumZHeight,
    forceDirect,
  } = args
  const actionName = 'moveToWell'
  const errors: CommandCreatorError[] = []
  const labwareState = prevRobotState.labware
  const { pipetteEntities, labwareEntities } = invariantContext
  const pipetteSpec = pipetteEntities[pipetteId]?.spec
  const isFlexPipette =
    (pipetteSpec?.displayCategory === 'FLEX' || pipetteSpec?.channels === 96) ??
    false

  const slotName = getLabwareSlot(
    labwareId,
    prevRobotState.labware,
    prevRobotState.modules
  )

  if (!pipetteSpec) {
    errors.push(
      errorCreators.pipetteDoesNotExist({
        pipette: pipetteId,
      })
    )
  }

  if (!labwareId || !prevRobotState.labware[labwareId]) {
    errors.push(
      errorCreators.labwareDoesNotExist({
        actionName,
        labware: labwareId,
      })
    )
  } else if (prevRobotState.labware[labwareId].slot === 'offDeck') {
    errors.push(errorCreators.labwareOffDeck())
  }

  if (COLUMN_4_SLOTS.includes(slotName)) {
    errors.push(
      errorCreators.pipettingIntoColumn4({ typeOfStep: 'move to well' })
    )
  } else if (labwareState[slotName] != null) {
    const adapterSlot = labwareState[slotName].slot
    if (COLUMN_4_SLOTS.includes(adapterSlot)) {
      errors.push(
        errorCreators.pipettingIntoColumn4({ typeOfStep: actionName })
      )
    }
  }

  if (
    modulePipetteCollision({
      pipette: pipetteId,
      labware: labwareId,
      invariantContext,
      prevRobotState,
    })
  ) {
    errors.push(errorCreators.modulePipetteCollisionDanger())
  }

  if (
    thermocyclerPipetteCollision(
      prevRobotState.modules,
      prevRobotState.labware,
      labwareId
    )
  ) {
    errors.push(errorCreators.thermocyclerLidClosed())
  }

  if (
    pipetteIntoHeaterShakerLatchOpen(
      prevRobotState.modules,
      prevRobotState.labware,
      labwareId
    )
  ) {
    errors.push(errorCreators.heaterShakerLatchOpen())
  }

  if (
    absorbanceReaderCollision(
      prevRobotState.modules,
      prevRobotState.labware,
      labwareId
    )
  ) {
    errors.push(errorCreators.absorbanceReaderLidClosed())
  }

  if (
    pipetteIntoHeaterShakerWhileShaking(
      prevRobotState.modules,
      prevRobotState.labware,
      labwareId
    )
  ) {
    errors.push(errorCreators.heaterShakerIsShaking())
  }
  if (
    pipetteAdjacentHeaterShakerWhileShaking(
      prevRobotState.modules,
      slotName,
      isFlexPipette ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE
    )
  ) {
    errors.push(errorCreators.heaterShakerNorthSouthEastWestShaking())
  }
  if (!isFlexPipette) {
    if (
      getIsHeaterShakerEastWestWithLatchOpen(prevRobotState.modules, slotName)
    ) {
      errors.push(errorCreators.heaterShakerEastWestWithLatchOpen())
    }

    if (
      getIsHeaterShakerEastWestMultiChannelPipette(
        prevRobotState.modules,
        slotName,
        pipetteSpec
      )
    ) {
      errors.push(errorCreators.heaterShakerEastWestOfMultiChannelPipette())
    }

    if (
      getIsHeaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette(
        prevRobotState.modules,
        slotName,
        pipetteSpec,
        labwareEntities[labwareId]
      )
    ) {
      errors.push(
        errorCreators.heaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette()
      )
    }
  }
  if (errors.length > 0) {
    return {
      errors,
    }
  }

  const pipettePythonName = pipetteEntities[pipetteId].pythonName
  const labwarePythonName = labwareEntities[labwareId].pythonName

  const commands: CreateCommand[] = [
    {
      commandType: 'moveToWell',
      key: uuid(),
      params: {
        pipetteId,
        labwareId,
        wellName,
        wellLocation,
        forceDirect,
        minimumZHeight,
      },
    },
  ]
  //  NOTE: forceDirect and minimumZHeight were never wired up in the form or stepArgs
  return {
    commands,
    python: `${pipettePythonName}.move_to(${labwarePythonName}[${formatPyStr(
      wellName
    )}]${formatPyWellLocation(wellLocation)}`,
  }
}
