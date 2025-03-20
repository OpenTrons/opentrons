import {
  ALL,
  COLUMN,
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
  SINGLE,
} from '@opentrons/shared-data'
import { getNextTiprack } from '../../robotStateSelectors'
import * as errorCreators from '../../errorCreators'
import { dropTipInTrash } from './dropTipInTrash'
import {
  curryCommandCreator,
  getIsHeaterShakerEastWestMultiChannelPipette,
  getIsHeaterShakerEastWestWithLatchOpen,
  getLabwareSlot,
  modulePipetteCollision,
  pipetteAdjacentHeaterShakerWhileShaking,
  reduceCommandCreators,
  PRIMARY_NOZZLE,
} from '../../utils'
import { dropTipInWasteChute } from './dropTipInWasteChute'
import { dropTip } from '../atomic/dropTip'
import { pickUpTip } from '../atomic/pickUpTip'
import { configureNozzleLayout } from '../atomic/configureNozzleLayout'

import type { CutoutId, NozzleConfigurationStyle } from '@opentrons/shared-data'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface ReplaceTipArgs {
  pipette: string
  dropTipLocation: string
  tipRack: string | null
  nozzles?: NozzleConfigurationStyle
}

/**
  Pick up next available tip. Works differently for an 8-channel which needs a full row of tips.
  Expects 96-well format tip naming system on the tiprack.
  If there's already a tip on the pipette, this will drop it before getting a new one
*/
export const replaceTip: CommandCreator<ReplaceTipArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipette, dropTipLocation, nozzles, tipRack } = args
  const stateNozzles = prevRobotState.pipettes[pipette].nozzles
  if (tipRack == null) {
    return {
      errors: [errorCreators.noTipSelected()],
    }
  }
  const { nextTiprack, tipracks } = getNextTiprack(
    pipette,
    tipRack,
    invariantContext,
    prevRobotState,
    nozzles
  )
  const pipetteSpec = invariantContext.pipetteEntities[pipette]?.spec
  const channels = pipetteSpec?.channels

  const hasMoreTipracksOnDeck =
    tipracks?.totalTipracks > tipracks?.filteredTipracks

  const is96ChannelTipracksAvailable =
    nextTiprack == null && channels === 96 && hasMoreTipracksOnDeck
  if (nozzles === ALL && is96ChannelTipracksAvailable) {
    return {
      errors: [errorCreators.missingAdapter()],
    }
  }

  if (nozzles === COLUMN && is96ChannelTipracksAvailable) {
    return {
      errors: [errorCreators.removeAdapter()],
    }
  }

  if (nextTiprack == null) {
    // no valid next tip / tiprack, bail out
    return {
      errors: [errorCreators.insufficientTips()],
    }
  }

  const isFlexPipette =
    (pipetteSpec?.displayCategory === 'FLEX' || channels === 96) ?? false

  if (!pipetteSpec)
    return {
      errors: [
        errorCreators.pipetteDoesNotExist({
          pipette,
        }),
      ],
    }
  const labwareDef =
    invariantContext.labwareEntities[nextTiprack.tiprackId]?.def

  const dropTipEntity =
    invariantContext.additionalEquipmentEntities[args.dropTipLocation]
  const isWasteChute = dropTipEntity?.name === 'wasteChute'
  const isTrashBin = dropTipEntity?.name === 'trashBin'

  if (!labwareDef) {
    return {
      errors: [
        errorCreators.labwareDoesNotExist({
          actionName: 'replaceTip',
          labware: nextTiprack.tiprackId,
        }),
      ],
    }
  }
  if (
    !args.dropTipLocation ||
    !invariantContext.additionalEquipmentEntities[args.dropTipLocation]
  ) {
    return { errors: [errorCreators.dropTipLocationDoesNotExist()] }
  }

  if (
    modulePipetteCollision({
      pipette,
      labware: nextTiprack.tiprackId,
      invariantContext,
      prevRobotState,
    })
  ) {
    return {
      errors: [errorCreators.modulePipetteCollisionDanger()],
    }
  }

  const slotName = getLabwareSlot(
    nextTiprack.tiprackId,
    prevRobotState.labware,
    prevRobotState.modules
  )
  if (
    pipetteAdjacentHeaterShakerWhileShaking(
      prevRobotState.modules,
      slotName,
      isFlexPipette ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE
    )
  ) {
    return {
      errors: [errorCreators.heaterShakerNorthSouthEastWestShaking()],
    }
  }
  if (!isFlexPipette) {
    if (
      getIsHeaterShakerEastWestWithLatchOpen(prevRobotState.modules, slotName)
    ) {
      return { errors: [errorCreators.heaterShakerEastWestWithLatchOpen()] }
    }

    if (
      getIsHeaterShakerEastWestMultiChannelPipette(
        prevRobotState.modules,
        slotName,
        pipetteSpec
      )
    ) {
      return {
        errors: [errorCreators.heaterShakerEastWestOfMultiChannelPipette()],
      }
    }
  }

  let primaryNozzle
  if (nozzles === COLUMN) {
    primaryNozzle = PRIMARY_NOZZLE
  } else if (nozzles === SINGLE && channels === 96) {
    primaryNozzle = 'H12'
  } else if (nozzles === SINGLE && channels === 8) {
    primaryNozzle = 'H1'
  }

  const configureNozzleLayoutCommand: CurriedCommandCreator[] =
    //  only emit the command if previous nozzle state is different
    (channels === 96 || channels === 8) &&
    args.nozzles != null &&
    args.nozzles !== stateNozzles
      ? [
          curryCommandCreator(configureNozzleLayout, {
            configurationParams: {
              primaryNozzle,
              style: args.nozzles,
            },
            pipetteId: args.pipette,
          }),
        ]
      : []

  let commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(dropTip, {
      pipette,
      dropTipLocation,
    }),
    ...configureNozzleLayoutCommand,
    curryCommandCreator(pickUpTip, {
      pipetteId: pipette,
      labwareId: nextTiprack.tiprackId,
      wellName: nextTiprack.well,
      nozzles: args.nozzles,
    }),
  ]
  if (isWasteChute) {
    commandCreators = [
      curryCommandCreator(dropTipInWasteChute, {
        pipetteId: args.pipette,
      }),
      ...configureNozzleLayoutCommand,
      curryCommandCreator(pickUpTip, {
        pipetteId: pipette,
        labwareId: nextTiprack.tiprackId,
        wellName: nextTiprack.well,
        nozzles: args.nozzles,
      }),
    ]
  }
  if (isTrashBin) {
    commandCreators = [
      curryCommandCreator(dropTipInTrash, {
        pipetteId: pipette,
        trashLocation: dropTipEntity.location as CutoutId,
      }),
      ...configureNozzleLayoutCommand,
      curryCommandCreator(pickUpTip, {
        pipetteId: pipette,
        labwareId: nextTiprack.tiprackId,
        wellName: nextTiprack.well,
        nozzles: args.nozzles,
      }),
    ]
  }

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
