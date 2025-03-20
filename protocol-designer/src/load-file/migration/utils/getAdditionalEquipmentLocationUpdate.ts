import {
  WASTE_CHUTE_ADDRESSABLE_AREAS,
  FLEX_ROBOT_TYPE,
  OT2_ROBOT_TYPE,
  MOVABLE_TRASH_ADDRESSABLE_AREAS,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import {
  COLUMN_4_SLOTS,
  uuid,
  getCutoutIdByAddressableArea,
  GRIPPER_LOCATION,
} from '@opentrons/step-generation'
import { getUnoccupiedSlotForTrash } from '../../../step-forms'
import type {
  AddressableAreaName,
  CreateCommand,
  LoadLabwareCreateCommand,
  MoveLabwareCreateCommand,
  MoveToAddressableAreaCreateCommand,
  MoveToAddressableAreaForDropTipCreateCommand,
  RobotType,
} from '@opentrons/shared-data'
import type { SavedStepFormState } from '../../../step-forms'

export type LocationUpdate = Record<string, string>

export interface AdditionalEquipmentLocationUpdate {
  trashBinLocationUpdate: LocationUpdate
  wasteChuteLocationUpdate: LocationUpdate
  stagingAreaLocationUpdate: LocationUpdate
  gripperLocationUpdate: LocationUpdate
}

const findTrashBinId = (savedStepForms: SavedStepFormState): string | null => {
  if (!savedStepForms) {
    return null
  }

  for (const stepForm of Object.values(savedStepForms)) {
    if (stepForm.stepType === 'moveLiquid') {
      if (stepForm.dispense_labware.toLowerCase().includes('trash')) {
        return stepForm.dispense_labware
      }
      if (stepForm.dropTip_location.toLowerCase().includes('trash')) {
        return stepForm.dropTip_location
      }
      if (stepForm.blowout_location?.toLowerCase().includes('trash')) {
        return stepForm.blowout_location
      }
    }
    if (stepForm.stepType === 'mix') {
      if (stepForm.dropTip_location.toLowerCase().includes('trash')) {
        return stepForm.dropTip_location
      } else if (stepForm.blowout_location?.toLowerCase().includes('trash')) {
        return stepForm.blowout_location
      }
    }
  }

  return null
}

const getStagingAreaSlotNames = (
  commands: CreateCommand[],
  commandType: 'moveLabware' | 'loadLabware',
  locationKey: 'newLocation' | 'location'
): AddressableAreaName[] => {
  return (
    Object.values(commands)
      .filter(
        (
          command
        ): command is MoveLabwareCreateCommand | LoadLabwareCreateCommand =>
          command.commandType === commandType &&
          //  @ts-expect-error: ts doesn't trust that locationkey is actually found in the command params
          command.params[locationKey] !== 'offDeck' &&
          //  @ts-expect-error
          command.params[locationKey] !== 'systemLocation' &&
          //  @ts-expect-error
          'addressableAreaName' in command.params[locationKey] &&
          COLUMN_4_SLOTS.includes(
            //  @ts-expect-error
            command.params[locationKey]
              .addressableAreaName as AddressableAreaName
          )
      )
      //  @ts-expect-error
      .map(command => command.params[locationKey].addressableAreaName)
  )
}

export const getAdditionalEquipmentLocationUpdate = (
  commands: CreateCommand[],
  robotType: RobotType,
  savedStepForms: SavedStepFormState
): AdditionalEquipmentLocationUpdate => {
  const isFlex = robotType === FLEX_ROBOT_TYPE

  const hasGripperCommands = Object.values(commands).some(
    (command): command is MoveLabwareCreateCommand =>
      (command.commandType === 'moveLabware' &&
        command.params.strategy === 'usingGripper') ||
      command.commandType === 'absorbanceReader/closeLid' ||
      command.commandType === 'absorbanceReader/openLid'
  )
  const hasWasteChuteCommands = Object.values(commands).some(
    command =>
      (command.commandType === 'moveToAddressableArea' &&
        WASTE_CHUTE_ADDRESSABLE_AREAS.includes(
          command.params.addressableAreaName as AddressableAreaName
        )) ||
      (command.commandType === 'moveLabware' &&
        command.params.newLocation !== 'offDeck' &&
        command.params.newLocation !== 'systemLocation' &&
        'addressableAreaName' in command.params.newLocation &&
        WASTE_CHUTE_ADDRESSABLE_AREAS.includes(
          command.params.newLocation.addressableAreaName as AddressableAreaName
        ))
  )

  const stagingAreaSlotNames = [
    ...new Set([
      ...getStagingAreaSlotNames(commands, 'moveLabware', 'newLocation'),
      ...getStagingAreaSlotNames(commands, 'loadLabware', 'location'),
    ]),
  ]

  const unoccupiedSlotForTrash = hasWasteChuteCommands
    ? ''
    : getUnoccupiedSlotForTrash(
        commands,
        hasWasteChuteCommands,
        stagingAreaSlotNames
      )

  const trashBinCommand = Object.values(commands).find(
    (
      command
    ): command is
      | MoveToAddressableAreaCreateCommand
      | MoveToAddressableAreaForDropTipCreateCommand =>
      (command.commandType === 'moveToAddressableArea' &&
        (MOVABLE_TRASH_ADDRESSABLE_AREAS.includes(
          command.params.addressableAreaName as AddressableAreaName
        ) ||
          command.params.addressableAreaName === 'fixedTrash')) ||
      command.commandType === 'moveToAddressableAreaForDropTip'
  )

  const trashAddressableAreaName = trashBinCommand?.params.addressableAreaName

  const trashBinId = findTrashBinId(savedStepForms)
  const trashCutoutId =
    trashAddressableAreaName != null
      ? getCutoutIdByAddressableArea(
          trashAddressableAreaName as AddressableAreaName,
          isFlex ? 'trashBinAdapter' : 'fixedTrashSlot',
          isFlex ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE
        )
      : null

  const moveLiquidStepWasteChute =
    savedStepForms != null
      ? Object.values(savedStepForms).find(
          stepForm =>
            stepForm.stepType === 'moveLiquid' &&
            (stepForm.aspirate_labware.includes('wasteChute') ||
              stepForm.dispense_labware.includes('wasteChute') ||
              stepForm.dropTip_location.includes('wasteChute') ||
              stepForm.blowout_location?.includes('wasteChute'))
        )
      : null

  let wasteChuteId: string | null = null
  if (hasWasteChuteCommands && moveLiquidStepWasteChute != null) {
    if (moveLiquidStepWasteChute.aspirate_labware.includes('wasteChute')) {
      wasteChuteId = moveLiquidStepWasteChute.aspirate_labware
    } else if (
      moveLiquidStepWasteChute.dispense_labware.includes('wasteChute')
    ) {
      wasteChuteId = moveLiquidStepWasteChute.dispense_labware
    } else if (
      moveLiquidStepWasteChute.dropTip_location.includes('wasteChute')
    ) {
      wasteChuteId = moveLiquidStepWasteChute.dropTip_location
    } else if (
      moveLiquidStepWasteChute.blowOut_location?.includes('wasteChute')
    ) {
      wasteChuteId = moveLiquidStepWasteChute.blowOut_location
    }
    //  new wasteChuteId generated for if there are only moveLabware commands
  } else if (hasWasteChuteCommands && moveLiquidStepWasteChute == null) {
    wasteChuteId = `${uuid()}:wasteChute`
  }

  let wasteChuteLocationUpdate: LocationUpdate =
    hasWasteChuteCommands && wasteChuteId != null
      ? {
          [wasteChuteId]: WASTE_CHUTE_CUTOUT,
        }
      : {}

  const gripperId = `${uuid()}:gripper`
  const gripperLocationUpdate: LocationUpdate = hasGripperCommands
    ? {
        [gripperId]: GRIPPER_LOCATION,
      }
    : {}

  const hardcodedTrashBinIdOt2 = `${uuid()}:trashBin`
  const hardcodedTrashBinOt2 = {
    [hardcodedTrashBinIdOt2]: getCutoutIdByAddressableArea(
      'fixedTrash' as AddressableAreaName,
      'fixedTrashSlot',
      OT2_ROBOT_TYPE
    ),
  }

  let trashBinLocationUpdate: LocationUpdate = hasWasteChuteCommands
    ? {}
    : hardcodedTrashBinOt2

  if (trashAddressableAreaName != null && trashBinId != null) {
    trashBinLocationUpdate = {
      [trashBinId]: trashCutoutId as string,
    }
    //  in case the user has no pipetting steps, auto-generate a trashBin or wasteChute entity for Flex
  } else if (isFlex && !hasWasteChuteCommands) {
    const hardCodedTrashIdFlex = `${uuid()}:movableTrash${unoccupiedSlotForTrash}`
    const hardCodedWasteChuteId = `${uuid()}:wasteChute`

    trashBinLocationUpdate =
      unoccupiedSlotForTrash === WASTE_CHUTE_CUTOUT
        ? {}
        : {
            [hardCodedTrashIdFlex]: getCutoutIdByAddressableArea(
              `movableTrash${unoccupiedSlotForTrash}` as AddressableAreaName,
              'trashBinAdapter',
              FLEX_ROBOT_TYPE
            ),
          }
    wasteChuteLocationUpdate =
      unoccupiedSlotForTrash === WASTE_CHUTE_CUTOUT
        ? {
            [hardCodedWasteChuteId]: WASTE_CHUTE_CUTOUT,
          }
        : {}
  }

  const stagingAreaLocationUpdate: LocationUpdate = stagingAreaSlotNames.reduce(
    (acc, slot) => {
      const stagingAreaId = `${uuid()}:stagingArea`
      const cutoutId = getCutoutIdByAddressableArea(
        slot,
        'stagingAreaRightSlot',
        isFlex ? FLEX_ROBOT_TYPE : OT2_ROBOT_TYPE
      )
      return {
        ...acc,
        [stagingAreaId]: cutoutId,
      }
    },
    {}
  )

  return {
    stagingAreaLocationUpdate,
    gripperLocationUpdate,
    wasteChuteLocationUpdate,
    trashBinLocationUpdate,
  }
}
