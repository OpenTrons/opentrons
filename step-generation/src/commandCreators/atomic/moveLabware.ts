import {
  ABSORBANCE_READER_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import * as errorCreators from '../../errorCreators'
import * as warningCreators from '../../warningCreators'
import {
  getHasWasteChute,
  getTiprackHasTips,
  getLabwareHasLiquid,
  uuid,
} from '../../utils'
import type { CreateCommand, MoveLabwareParams } from '@opentrons/shared-data'
import type {
  CommandCreator,
  CommandCreatorError,
  CommandCreatorWarning,
} from '../../types'

/** Move labware from one location to another, manually or via a gripper. */
export const moveLabware: CommandCreator<MoveLabwareParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { labwareId, strategy, newLocation } = args
  const useGripper = strategy === 'usingGripper'
  const { additionalEquipmentEntities, labwareEntities } = invariantContext
  const hasWasteChute = getHasWasteChute(additionalEquipmentEntities)
  const tiprackHasTip =
    prevRobotState.tipState != null
      ? getTiprackHasTips(prevRobotState.tipState, labwareId)
      : false
  const labwareHasLiquid =
    prevRobotState.liquidState != null
      ? getLabwareHasLiquid(prevRobotState.liquidState, labwareId)
      : false
  const hasTipOnPipettes = Object.values(
    prevRobotState.tipState.pipettes
  ).includes(true)
  const actionName = 'moveToLabware'
  const errors: CommandCreatorError[] = []
  const warnings: CommandCreatorWarning[] = []

  const newLocationInWasteChute =
    newLocation !== 'offDeck' &&
    newLocation !== 'systemLocation' &&
    'addressableAreaName' in newLocation &&
    newLocation.addressableAreaName === 'gripperWasteChute'

  const hasGripper = Object.values(additionalEquipmentEntities).find(
    aE => aE.name === 'gripper'
  )

  const newLocationSlot =
    newLocation !== 'offDeck' && newLocation !== 'systemLocation'
      ? Object.values(newLocation)[0]
      : null

  const multipleObjectsInSameSlotLabware =
    Object.values(prevRobotState.labware).find(
      labware => labware.slot === newLocationSlot
    ) != null

  const multipleObjectsInSameSlotModule = Object.values(
    prevRobotState.modules
  ).find(module => module.slot === newLocationSlot)

  if (!labwareId || !prevRobotState.labware[labwareId]) {
    errors.push(
      errorCreators.labwareDoesNotExist({
        actionName,
        labware: labwareId,
      })
    )
  } else if (
    prevRobotState.labware[labwareId].slot === 'offDeck' &&
    useGripper
  ) {
    errors.push(errorCreators.labwareOffDeck())
  } else if (
    multipleObjectsInSameSlotLabware ||
    multipleObjectsInSameSlotModule
  ) {
    errors.push(errorCreators.multipleEntitiesOnSameSlotName())
  }

  const isAluminumBlock =
    labwareEntities[labwareId]?.def.metadata.displayCategory === 'aluminumBlock'

  if (useGripper && isAluminumBlock) {
    errors.push(errorCreators.cannotMoveWithGripper())
  }

  if (
    (newLocationInWasteChute && hasGripper && !useGripper) ||
    (!hasGripper && useGripper)
  ) {
    errors.push(errorCreators.gripperRequired())
  }

  if (hasTipOnPipettes && useGripper) {
    errors.push(errorCreators.pipetteHasTip())
  }

  const initialLabwareSlot = prevRobotState.labware[labwareId]?.slot

  if (hasWasteChute && initialLabwareSlot === 'gripperWasteChute') {
    errors.push(errorCreators.labwareDiscarded())
  }
  const initialAdapterSlot = prevRobotState.labware[initialLabwareSlot]?.slot
  const initialSlot =
    initialAdapterSlot != null ? initialAdapterSlot : initialLabwareSlot

  const initialModuleState =
    prevRobotState.modules[initialSlot]?.moduleState ?? null
  if (initialModuleState != null) {
    if (
      initialModuleState.type === THERMOCYCLER_MODULE_TYPE &&
      initialModuleState.lidOpen !== true
    ) {
      errors.push(errorCreators.thermocyclerLidClosed())
    } else if (initialModuleState.type === HEATERSHAKER_MODULE_TYPE) {
      if (initialModuleState.latchOpen !== true) {
        errors.push(errorCreators.heaterShakerLatchClosed())
      } else if (initialModuleState.targetSpeed !== null) {
        errors.push(errorCreators.heaterShakerIsShaking())
      }
    } else if (
      initialModuleState.type === ABSORBANCE_READER_TYPE &&
      initialModuleState.lidOpen !== true
    ) {
      errors.push(errorCreators.absorbanceReaderLidClosed())
    }
  }
  const destModuleId =
    newLocation !== 'offDeck' &&
    newLocation !== 'systemLocation' &&
    'moduleId' in newLocation
      ? newLocation.moduleId
      : null

  const destAdapterId =
    newLocation !== 'offDeck' &&
    newLocation !== 'systemLocation' &&
    'labwareId' in newLocation
      ? newLocation.labwareId
      : null

  const destModuleOrSlotUnderAdapterId =
    destAdapterId != null ? prevRobotState.labware[destAdapterId].slot : null
  const destinationModuleIdOrSlot =
    destModuleOrSlotUnderAdapterId != null
      ? destModuleOrSlotUnderAdapterId
      : destModuleId

  if (newLocation === 'offDeck' && useGripper) {
    errors.push(errorCreators.labwareOffDeck())
  }

  if (tiprackHasTip && newLocationInWasteChute && hasWasteChute) {
    warnings.push(warningCreators.tiprackInWasteChuteHasTips())
  } else if (labwareHasLiquid && newLocationInWasteChute && hasWasteChute) {
    warnings.push(warningCreators.labwareInWasteChuteHasLiquid())
  }

  if (
    destinationModuleIdOrSlot != null &&
    prevRobotState.modules[destinationModuleIdOrSlot] != null
  ) {
    const destModuleState =
      prevRobotState.modules[destinationModuleIdOrSlot].moduleState

    if (
      destModuleState.type === THERMOCYCLER_MODULE_TYPE &&
      destModuleState.lidOpen !== true
    ) {
      errors.push(errorCreators.thermocyclerLidClosed())
    } else if (destModuleState.type === HEATERSHAKER_MODULE_TYPE) {
      if (destModuleState.latchOpen !== true) {
        errors.push(errorCreators.heaterShakerLatchClosed())
      }
      if (destModuleState.targetSpeed !== null) {
        errors.push(errorCreators.heaterShakerIsShaking())
      }
    } else if (destModuleState.type === ABSORBANCE_READER_TYPE) {
      if (destModuleState.lidOpen !== true) {
        errors.push(errorCreators.absorbanceReaderLidClosed())
      }
    }
  }

  if (errors.length > 0) {
    return { errors }
  }

  const params = {
    labwareId,
    strategy,
    newLocation,
  }

  const commands: CreateCommand[] = [
    {
      commandType: 'moveLabware',
      key: uuid(),
      params,
    },
  ]

  return {
    commands,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}
