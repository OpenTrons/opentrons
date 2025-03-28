/** Utility fns to create reusable CommandCreatorErrors */
import type { CommandCreatorError } from './types'

// NOTE: in PD UI, the `message` key here is finally handled by ErrorContents component.
// To support step-generation as an independent library (someday), messages should also exist here
// for future programmatic use

export function insufficientTips(): CommandCreatorError {
  return {
    type: 'INSUFFICIENT_TIPS',
    message: 'Not enough tips to complete action',
  }
}

export function missingAdapter(): CommandCreatorError {
  return {
    type: 'MISSING_96_CHANNEL_TIPRACK_ADAPTER',
    message: 'A 96-channel cannot pick up tips fully without an adapter',
  }
}

export function removeAdapter(): CommandCreatorError {
  return {
    type: 'REMOVE_96_CHANNEL_TIPRACK_ADAPTER',
    message: 'A 96-channel cannot pick up tips partially with an adapter',
  }
}

export function noTipOnPipette(args: {
  actionName: string
  pipette: string
  labware: string
  well: string
}): CommandCreatorError {
  const { actionName, pipette, labware, well } = args
  return {
    message: `Attempted to ${actionName} with no tip on pipette: ${pipette} from ${labware}'s well ${well}`,
    type: 'NO_TIP_ON_PIPETTE',
  }
}

export function pipetteHasTip(): CommandCreatorError {
  return {
    message: 'One or more of the pipettes has a tip',
    type: 'PIPETTE_HAS_TIP',
  }
}

export function pipetteDoesNotExist(args: {
  pipette: string
}): CommandCreatorError {
  const { pipette } = args
  return {
    message: `This step tries to use the ${pipette}. Add the pipette to your protocol or change the step to use a different pipette.`,
    type: 'PIPETTE_DOES_NOT_EXIST',
  }
}

export function invalidSlot(args: {
  actionName: string
  slot: string
}): CommandCreatorError {
  const { actionName, slot } = args
  return {
    message: `Attempted to ${actionName} with slot "${slot}", this is not a valid slot"`,
    type: 'INVALID_SLOT',
  }
}

export function labwareDoesNotExist(args: {
  actionName: string
  labware: string
}): CommandCreatorError {
  const { actionName, labware } = args
  console.warn(
    `Attempted to ${actionName} with labware id "${labware}", this labware was not found under "labware"`
  )
  return {
    message: `This step tries to use ${labware}. Add the labware to your protocol or change the step to use a different labware.`,
    type: 'LABWARE_DOES_NOT_EXIST',
  }
}

export function missingModuleError(): CommandCreatorError {
  return {
    message: 'This step requires a module, but none is selected',
    type: 'MISSING_MODULE',
  }
}

export function missingTemperatureStep(): CommandCreatorError {
  return {
    message:
      'This module is not changing temperature because it has either been deactivated or is already holding a temperature. In order to pause the protocol and wait for your module to reach a temperature, you must first use a Temperature step to tell the module to start changing to a new temperature',
    type: 'MISSING_TEMPERATURE_STEP',
  }
}

export function tipVolumeExceeded(args: {
  actionName: string
  volume: string | number
  maxVolume: string | number
}): CommandCreatorError {
  const { volume, maxVolume, actionName } = args
  return {
    message: `This step tries to ${actionName} ${volume}µL, but the tip can only hold ${maxVolume}µL.`,
    type: 'TIP_VOLUME_EXCEEDED',
  }
}

export function pipetteVolumeExceeded(args: {
  actionName: string
  volume: string | number
  maxVolume: string | number
  disposalVolume?: string | number
}): CommandCreatorError {
  const { actionName, volume, maxVolume, disposalVolume } = args
  const message =
    disposalVolume != null
      ? `Attemped to ${actionName} volume + disposal volume greater than pipette max volume (${volume} + ${disposalVolume} > ${maxVolume})`
      : `This step tries to ${actionName} ${volume}µL, but the tip can only hold ${maxVolume}µL.`
  return {
    message,
    type: 'PIPETTE_VOLUME_EXCEEDED',
  }
}

export const modulePipetteCollisionDanger = (): CommandCreatorError => {
  return {
    type: 'MODULE_PIPETTE_COLLISION_DANGER',
    message:
      'Gen 1 8-Channel pipettes cannot access labware or tip racks in slot 4 or 6 because they are adjacent to modules.',
  }
}

export const thermocyclerLidClosed = (): CommandCreatorError => {
  return {
    type: 'THERMOCYCLER_LID_CLOSED',
    message:
      'Attempted to interact with contents of a thermocycler with the lid closed.',
  }
}

export const heaterShakerLatchOpen = (): CommandCreatorError => {
  return {
    type: 'HEATER_SHAKER_LATCH_OPEN',
    message:
      'Attempted to interact with contents of a heater-shaker with the latch open.',
  }
}

export const heaterShakerLatchClosed = (): CommandCreatorError => {
  return {
    type: 'HEATER_SHAKER_LATCH_CLOSED',
    message:
      'Attempted to move the contents of a heater-shaker with the latch closed.',
  }
}

export const absorbanceReaderLidClosed = (): CommandCreatorError => {
  return {
    type: 'ABSORBANCE_READER_LID_CLOSED',
    message:
      'Attempted to interact with contents of an absorbance plate reader with the lid closed.',
  }
}

export const absorbanceReaderNoInitialization = (): CommandCreatorError => {
  return {
    type: 'ABSORBANCE_READER_NO_INITIALIZATION',
    message:
      'This step tries to read labware without initializing the Plate Reader first. Initialize the Plate Reader module or remove this step in order to proceed.',
  }
}

export const absorbanceReaderNoGripper = (): CommandCreatorError => {
  return {
    type: 'ABSORBANCE_READER_NO_GRIPPER',
    message:
      'This step involves opening or closing the Absorbance Plate Reader lid with a gripper. Add a gripper or remove step to proceed.',
  }
}

export const heaterShakerIsShaking = (): CommandCreatorError => {
  return {
    type: 'HEATER_SHAKER_IS_SHAKING',
    message:
      'Attempted to interact with the contents of a heater-shaker when it is shaking.',
  }
}

export const tallLabwareEastWestOfHeaterShaker = (
  position: 'left' | 'right'
): CommandCreatorError => {
  return {
    type: 'TALL_LABWARE_EAST_WEST_OF_HEATER_SHAKER',
    message: `Labware over 53 mm is ${position} of this Heater-Shaker module.`,
  }
}

export const possiblePipetteCollision = (): CommandCreatorError => {
  return {
    type: 'POSSIBLE_PIPETTE_COLLISION',
    message:
      'There is a possibility that the Pipette will collide with the a labware or module on the deck',
  }
}

export const heaterShakerEastWestWithLatchOpen = (): CommandCreatorError => {
  return {
    type: 'HEATER_SHAKER_EAST_WEST_LATCH_OPEN',
    message: 'The Heater-Shaker labware latch is open',
  }
}

export const heaterShakerNorthSouthEastWestShaking = (): CommandCreatorError => {
  return {
    type: 'HEATER_SHAKER_NORTH_SOUTH_EAST_WEST_SHAKING',
    message: 'The Heater-Shaker is shaking',
  }
}

export const heaterShakerEastWestOfMultiChannelPipette = (): CommandCreatorError => {
  return {
    type: 'HEATER_SHAKER_EAST_WEST_MULTI_CHANNEL',
    message: 'The Heater-Shaker is shaking',
  }
}

export const heaterShakerNorthSouthOfNonTiprackWithMultiChannelPipette = (): CommandCreatorError => {
  return {
    type: 'HEATER_SHAKER_NORTH_SOUTH__OF_NON_TIPRACK_WITH_MULTI_CHANNEL',
    message: '8-Channel pipette cannot access labware',
  }
}

export const labwareOffDeck = (): CommandCreatorError => {
  return {
    type: 'LABWARE_OFF_DECK',
    message: 'Attempted to interact with labware off deck',
  }
}

export const multipleEntitiesOnSameSlotName = (): CommandCreatorError => {
  return {
    type: 'LABWARE_ON_ANOTHER_ENTITY',
    message:
      'Attempted to move labware onto another entity with the same slotName',
  }
}

export const dropTipLocationDoesNotExist = (): CommandCreatorError => {
  return {
    type: 'DROP_TIP_LOCATION_DOES_NOT_EXIST',
    message: 'The destination for dropping tip does not exist',
  }
}

export const equipmentDoesNotExist = (): CommandCreatorError => {
  return {
    type: 'EQUIPMENT_DOES_NOT_EXIST',
    message: `Equipment does not exist.`,
  }
}

export const gripperRequired = (): CommandCreatorError => {
  return {
    type: 'GRIPPER_REQUIRED',
    message: 'The gripper is required to fulfill this action',
  }
}

export const pipettingIntoColumn4 = (args: {
  typeOfStep: string
}): CommandCreatorError => {
  return {
    type: 'PIPETTING_INTO_COLUMN_4',
    message: `Cannot ${args.typeOfStep} into a column 4 slot.`,
  }
}

export const cannotMoveWithGripper = (): CommandCreatorError => {
  return {
    type: 'CANNOT_MOVE_WITH_GRIPPER',
    message: 'The gripper cannot move aluminum blocks',
  }
}

export const noTipSelected = (): CommandCreatorError => {
  return {
    type: 'NO_TIP_SELECTED',
    message: 'No tips were selected for this step',
  }
}

export const labwareDiscarded = (): CommandCreatorError => {
  return {
    type: 'LABWARE_DISCARDED_IN_WASTE_CHUTE',
    message: 'The labware was discarded in waste chute in a previous step.',
  }
}
