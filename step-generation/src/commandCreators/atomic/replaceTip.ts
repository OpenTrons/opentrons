import {
  ALL,
  COLUMN,
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
  SINGLE,
} from '@opentrons/shared-data'
import { getNextTiprack } from '../../robotStateSelectors'
import * as errorCreators from '../../errorCreators'
import { COLUMN_4_SLOTS } from '../../constants'
import { movableTrashCommandsUtil } from '../../utils/movableTrashCommandsUtil'
import {
  curryCommandCreator,
  getIsHeaterShakerEastWestMultiChannelPipette,
  getIsHeaterShakerEastWestWithLatchOpen,
  getIsSafePipetteMovement,
  getLabwareSlot,
  modulePipetteCollision,
  pipetteAdjacentHeaterShakerWhileShaking,
  reduceCommandCreators,
  uuid,
  wasteChuteCommandsUtil,
  getWasteChuteAddressableAreaNamePip,
} from '../../utils'
import { dropTip } from './dropTip'
import { configureNozzleLayout } from './configureNozzleLayout'

import type { NozzleConfigurationStyle } from '@opentrons/shared-data'
import type {
  CommandCreator,
  CommandCreatorError,
  CurriedCommandCreator,
} from '../../types'

interface PickUpTipArgs {
  pipette: string
  tiprack: string
  well: string
  nozzles?: NozzleConfigurationStyle
}

const _pickUpTip: CommandCreator<PickUpTipArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const errors: CommandCreatorError[] = []

  const pipChannels =
    invariantContext.pipetteEntities[args.pipette]?.spec.channels
  const is96Channel = pipChannels === 96
  const is8Channel = pipChannels === 8

  if (
    ((is96Channel && args.nozzles !== ALL) ||
      (is8Channel && args.nozzles === SINGLE)) &&
    !getIsSafePipetteMovement(
      args.nozzles ?? null,
      prevRobotState,
      invariantContext,
      args.pipette,
      args.tiprack,
      args.tiprack,
      //  we don't adjust the offset when moving to the tiprack
      { x: 0, y: 0 },
      args.well
    )
  ) {
    errors.push(errorCreators.possiblePipetteCollision())
  }

  const tiprackSlot = prevRobotState.labware[args.tiprack].slot
  if (COLUMN_4_SLOTS.includes(tiprackSlot)) {
    errors.push(
      errorCreators.pipettingIntoColumn4({ typeOfStep: 'pick up tip' })
    )
  } else if (prevRobotState.labware[tiprackSlot] != null) {
    const adapterSlot = prevRobotState.labware[tiprackSlot].slot
    if (COLUMN_4_SLOTS.includes(adapterSlot)) {
      errors.push(
        errorCreators.pipettingIntoColumn4({ typeOfStep: 'pick up tip' })
      )
    }
  }

  if (errors.length > 0) {
    return { errors }
  }
  return {
    commands: [
      {
        commandType: 'pickUpTip',
        key: uuid(),
        params: {
          pipetteId: args.pipette,
          labwareId: args.tiprack,
          wellName: args.well,
        },
      },
    ],
  }
}

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

  const isWasteChute =
    invariantContext.additionalEquipmentEntities[dropTipLocation] != null &&
    invariantContext.additionalEquipmentEntities[dropTipLocation].name ===
      'wasteChute'

  const isTrashBin =
    invariantContext.additionalEquipmentEntities[dropTipLocation] != null &&
    invariantContext.additionalEquipmentEntities[dropTipLocation].name ===
      'trashBin'

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

  const addressableAreaNameWasteChute = getWasteChuteAddressableAreaNamePip(
    channels
  )

  const configureNozzleLayoutCommand: CurriedCommandCreator[] =
    //  only emit the command if previous nozzle state is different
    (channels === 96 || channels === 8) &&
    args.nozzles != null &&
    args.nozzles !== stateNozzles
      ? [
          curryCommandCreator(configureNozzleLayout, {
            nozzles: args.nozzles,
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
    curryCommandCreator(_pickUpTip, {
      pipette,
      tiprack: nextTiprack.tiprackId,
      well: nextTiprack.well,
      nozzles: args.nozzles,
    }),
  ]
  if (isWasteChute) {
    commandCreators = [
      ...wasteChuteCommandsUtil({
        type: 'dropTip',
        pipetteId: pipette,
        addressableAreaName: addressableAreaNameWasteChute,
        prevRobotState,
      }),
      ...configureNozzleLayoutCommand,
      curryCommandCreator(_pickUpTip, {
        pipette,
        tiprack: nextTiprack.tiprackId,
        well: nextTiprack.well,
        nozzles: args.nozzles,
      }),
    ]
  }
  if (isTrashBin) {
    commandCreators = [
      ...movableTrashCommandsUtil({
        type: 'dropTip',
        pipetteId: pipette,
        prevRobotState,
        invariantContext,
      }),
      ...configureNozzleLayoutCommand,
      curryCommandCreator(_pickUpTip, {
        pipette,
        tiprack: nextTiprack.tiprackId,
        well: nextTiprack.well,
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
