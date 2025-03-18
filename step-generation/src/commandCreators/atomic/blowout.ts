import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import {
  uuid,
  getLabwareSlot,
  modulePipetteCollision,
  thermocyclerPipetteCollision,
  absorbanceReaderCollision,
  pipetteIntoHeaterShakerLatchOpen,
  pipetteIntoHeaterShakerWhileShaking,
  pipetteAdjacentHeaterShakerWhileShaking,
  getIsHeaterShakerEastWestMultiChannelPipette,
  getIsHeaterShakerEastWestWithLatchOpen,
  getIsHeaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette,
  formatPyStr,
} from '../../utils'
import { COLUMN_4_SLOTS } from '../../constants'
import * as errorCreators from '../../errorCreators'
import type { CreateCommand, BlowoutParams } from '@opentrons/shared-data'
import type { CommandCreatorError, CommandCreator } from '../../types'

export const blowout: CommandCreator<BlowoutParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /** Blowout with given args. Requires tip. */
  const { pipetteId, labwareId, wellName, wellLocation, flowRate } = args
  const { pipetteEntities, labwareEntities } = invariantContext
  const pipette = pipetteEntities[pipetteId]
  const actionName = 'blowout'
  const errors: CommandCreatorError[] = []
  const pipetteSpec = pipette?.spec
  const isFlexPipette =
    (pipetteSpec?.displayCategory === 'FLEX' || pipetteSpec?.channels === 96) ??
    false
  const pipetteData = prevRobotState.pipettes[pipetteId]
  const labwareState = prevRobotState.labware
  const slotName = getLabwareSlot(
    labwareId,
    prevRobotState.labware,
    prevRobotState.modules
  )
  // TODO Ian 2018-04-30 this logic using command creator args + robotstate to push errors
  // is duplicated across several command creators (eg aspirate & blowout overlap).
  // You can probably make higher-level error creator util fns to be more DRY
  if (!pipetteData) {
    errors.push(
      errorCreators.pipetteDoesNotExist({
        pipette: pipetteId,
      })
    )
  }

  if (pipetteSpec == null) {
    errors.push(
      errorCreators.pipetteDoesNotExist({
        pipette: pipetteId,
      })
    )
  }

  if (!prevRobotState.tipState.pipettes[pipetteId]) {
    errors.push(
      errorCreators.noTipOnPipette({
        actionName,
        pipette: pipetteId,
        labware: labwareId,
        well: wellName,
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
  } else if (prevRobotState.labware[labwareId]?.slot === 'offDeck') {
    errors.push(errorCreators.labwareOffDeck())
  }

  if (COLUMN_4_SLOTS.includes(slotName)) {
    errors.push(errorCreators.pipettingIntoColumn4({ typeOfStep: actionName }))
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
    absorbanceReaderCollision(
      prevRobotState.modules,
      prevRobotState.labware,
      labwareId
    )
  ) {
    errors.push(errorCreators.absorbanceReaderLidClosed())
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
  if (!isFlexPipette && pipetteSpec != null) {
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
        invariantContext.labwareEntities[labwareId]
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

  const pipettePythonName = pipette.pythonName
  const labwarePythonName = labwareEntities[labwareId].pythonName

  const commands: CreateCommand[] = [
    {
      commandType: 'blowout',
      key: uuid(),
      params: {
        pipetteId,
        labwareId,
        wellName,
        flowRate,
        wellLocation,
      },
    },
  ]
  return {
    commands,
    python: `${pipettePythonName}.blow_out(${labwarePythonName}[${formatPyStr(
      wellName
    )}])`,
  }
}
