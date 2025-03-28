import { ALL, FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
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
  getIsSafePipetteMovement,
  formatPyStr,
  formatPyWellLocation,
  indentPyLines,
} from '../../utils'
import { COLUMN_4_SLOTS } from '../../constants'
import type {
  CreateCommand,
  DispenseParams,
  NozzleConfigurationStyle,
} from '@opentrons/shared-data'
import type { Point } from '../../utils'
import type { CommandCreator, CommandCreatorError } from '../../types'

export interface DispenseAtomicCommandParams extends DispenseParams {
  nozzles: NozzleConfigurationStyle | null
  tipRack: string
  isAirGap?: boolean
}
/** Dispense with given args. Requires tip. */
export const dispense: CommandCreator<DispenseAtomicCommandParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const {
    pipetteId,
    volume,
    labwareId,
    wellName,
    flowRate,
    isAirGap,
    wellLocation,
    nozzles,
    tipRack,
  } = args
  const actionName = 'dispense'
  const labwareState = prevRobotState.labware
  const errors: CommandCreatorError[] = []
  const pipetteSpec = invariantContext.pipetteEntities[pipetteId]?.spec
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

  const isMultiChannelPipette =
    invariantContext.pipetteEntities[pipetteId]?.spec.channels !== 1

  if (
    isMultiChannelPipette &&
    nozzles !== ALL &&
    !getIsSafePipetteMovement(
      nozzles,
      prevRobotState,
      invariantContext,
      pipetteId,
      labwareId,
      tipRack,
      (wellLocation?.offset as Point) ?? { x: 0, y: 0, z: 0 },
      wellName
    )
  ) {
    errors.push(errorCreators.possiblePipetteCollision())
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

  const commands: CreateCommand[] = [
    {
      commandType: 'dispense',
      key: uuid(),
      params: {
        pipetteId,
        volume,
        labwareId,
        wellName,
        wellLocation,
        flowRate,
        //  pushOut will always be undefined in step-generation for now
        //  since there is no easy way to allow users to  for it in PD
      },
      ...(isAirGap && { meta: { isAirGap } }),
    },
  ]

  const pipettePythonName =
    invariantContext.pipetteEntities[pipetteId].pythonName
  const labwarePythonName =
    invariantContext.labwareEntities[labwareId].pythonName
  const pythonArgs = [
    `volume=${volume}`,
    `location=${labwarePythonName}[${formatPyStr(
      wellName
    )}]${formatPyWellLocation(wellLocation)}`,
    // rate= is a ratio in the PAPI, and we have no good way to figure out what
    // flowrate the PAPI has set the pipette to, so we just have to emit a division:
    `rate=${flowRate} / ${pipettePythonName}.flow_rate.dispense`,
    // PAPI has no way to indicate that we're dispensing air, so we don't do anything
    // with the isAirGap parameter.
  ]
  const python = `${pipettePythonName}.dispense(\n${indentPyLines(
    pythonArgs.join(',\n')
  )},\n)`

  return {
    commands,
    python,
  }
}
