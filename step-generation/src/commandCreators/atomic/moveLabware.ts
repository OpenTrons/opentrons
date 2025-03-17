import {
  ABSORBANCE_READER_TYPE,
  FLEX_ROBOT_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MOVABLE_TRASH_ADDRESSABLE_AREAS,
  OT2_ROBOT_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  WASTE_CHUTE_ADDRESSABLE_AREAS,
} from '@opentrons/shared-data'
import { COLUMN_4_SLOTS } from '../../constants'
import * as errorCreators from '../../errorCreators'
import * as warningCreators from '../../warningCreators'
import {
  formatPyStr,
  getCutoutIdByAddressableArea,
  getHasWasteChute,
  getLabwareHasLiquid,
  getTiprackHasTips,
  OFF_DECK,
  PROTOCOL_CONTEXT_NAME,
  uuid,
} from '../../utils'
import type {
  AddressableAreaName,
  CreateCommand,
  CutoutId,
  MoveLabwareParams,
} from '@opentrons/shared-data'
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
  const {
    additionalEquipmentEntities,
    labwareEntities,
    moduleEntities,
  } = invariantContext
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
    newLocation !== 'offDeck' &&
    newLocation !== 'systemLocation' &&
    'slotName' in newLocation
      ? newLocation.slotName
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

  const labwarePythonName = labwareEntities[labwareId].pythonName
  let location: string = ''
  if (newLocation === 'offDeck') {
    location = OFF_DECK
  } else if (newLocation === 'systemLocation') {
    location = 'system_location' // NOTE: i think this is for LPC but shouldn't be used in PD
  } else if ('labwareId' in newLocation) {
    location = labwareEntities[newLocation.labwareId].pythonName
  } else if ('moduleId' in newLocation) {
    location = moduleEntities[newLocation.moduleId].pythonName
  } else if ('slotName' in newLocation) {
    location = formatPyStr(newLocation.slotName)
  } else if ('addressableAreaName' in newLocation) {
    const is4thColumnSlot = COLUMN_4_SLOTS.includes(
      newLocation.addressableAreaName
    )

    const isWasteChuteLocation = WASTE_CHUTE_ADDRESSABLE_AREAS.includes(
      newLocation.addressableAreaName
    )
    const isOt2TrashLocation = newLocation.addressableAreaName === 'fixedTrash'
    const isTrashBinLocation =
      MOVABLE_TRASH_ADDRESSABLE_AREAS.includes(
        newLocation.addressableAreaName
      ) || isOt2TrashLocation
    const trashCutoutIds = isTrashBinLocation
      ? Object.values(additionalEquipmentEntities)
          .filter(ae => ae.name === 'trashBin')
          ?.map(trash => trash.location as CutoutId)
      : []

    const cutoutIdFromAddressableAreaName =
      !isWasteChuteLocation && !is4thColumnSlot
        ? getCutoutIdByAddressableArea(
            newLocation.addressableAreaName as AddressableAreaName,
            isOt2TrashLocation ? 'fixedTrashSlot' : 'trashBinAdapter',
            isOt2TrashLocation ? OT2_ROBOT_TYPE : FLEX_ROBOT_TYPE
          )
        : null

    const matchingTrashCutoutId = trashCutoutIds.find(
      cutoutId => cutoutId === cutoutIdFromAddressableAreaName
    )
    const matchingTrashId =
      matchingTrashCutoutId != null
        ? Object.values(additionalEquipmentEntities).find(
            ae => ae.location === matchingTrashCutoutId
          )?.id
        : null

    if (is4thColumnSlot) {
      location = formatPyStr(newLocation.addressableAreaName)
    } else if (matchingTrashId != null && !isWasteChuteLocation) {
      location = additionalEquipmentEntities[matchingTrashId]?.pythonName ?? ''
    } else if (matchingTrashId == null && isWasteChuteLocation) {
      location =
        Object.values(additionalEquipmentEntities).find(
          ae => ae.name === 'wasteChute'
        )?.pythonName ?? ''
    } else {
      location = ''
    }
  }

  if (location === '') {
    console.error('expected to find a python new location but could not')
  }

  const pythonUseGripper = useGripper ? ', use_gripper=True' : ''
  const python = `${PROTOCOL_CONTEXT_NAME}.move_labware(${labwarePythonName}, ${location}${pythonUseGripper})`

  return {
    commands,
    warnings: warnings.length > 0 ? warnings : undefined,
    python,
  }
}
