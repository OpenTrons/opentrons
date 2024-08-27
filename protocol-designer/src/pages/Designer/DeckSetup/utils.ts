import {
  FLEX_ROBOT_TYPE,
  FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_V1,
  OT2_ROBOT_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER_MODULE_V2,
  getAreSlotsAdjacent,
  getModuleType,
} from '@opentrons/shared-data'
import some from 'lodash/some'

import { getOnlyLatestDefs } from '../../../labware-defs'
import {
  FLEX_MODULE_MODELS,
  OT2_MODULE_MODELS,
  RECOMMENDED_LABWARE_BY_MODULE,
} from './constants'

import type {
  AddressableAreaName,
  CutoutFixture,
  CutoutId,
  DeckSlotId,
  LabwareDefinition2,
  ModuleModel,
  RobotType,
} from '@opentrons/shared-data'
import type { InitialDeckSetup } from '../../../step-forms'

export function getCutoutIdForAddressableArea(
  addressableArea: AddressableAreaName,
  cutoutFixtures: CutoutFixture[]
): CutoutId | null {
  return cutoutFixtures.reduce<CutoutId | null>((acc, cutoutFixture) => {
    const [cutoutId] =
      Object.entries(
        cutoutFixture.providesAddressableAreas
      ).find(([_cutoutId, providedAAs]) =>
        providedAAs.includes(addressableArea)
      ) ?? []
    return (cutoutId as CutoutId) ?? acc
  }, null)
}

export function getModuleModelsBySlot(
  enableAbsorbanceReader: boolean,
  robotType: RobotType,
  slot: DeckSlotId
): ModuleModel[] {
  const FLEX_MIDDLE_SLOTS = ['B2', 'C2', 'A2', 'D2']
  const OT2_MIDDLE_SLOTS = ['2', '5', '8', '11']

  let moduleModels: ModuleModel[] = enableAbsorbanceReader
    ? FLEX_MODULE_MODELS.filter(model => model !== 'absorbanceReaderV1')
    : FLEX_MODULE_MODELS

  switch (robotType) {
    case FLEX_ROBOT_TYPE: {
      if (slot !== 'B1' && !FLEX_MIDDLE_SLOTS.includes(slot)) {
        moduleModels = FLEX_MODULE_MODELS.filter(
          model => model !== THERMOCYCLER_MODULE_V2
        )
      }
      if (FLEX_MIDDLE_SLOTS.includes(slot)) {
        moduleModels = FLEX_MODULE_MODELS.filter(
          model => model === MAGNETIC_BLOCK_V1
        )
      }
      if (
        FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS.includes(
          slot as AddressableAreaName
        )
      ) {
        moduleModels = []
      }
      break
    }
    case OT2_ROBOT_TYPE: {
      if (OT2_MIDDLE_SLOTS.includes(slot)) {
        moduleModels = []
      } else if (slot === '7') {
        moduleModels = OT2_MODULE_MODELS
      } else if (slot === '9') {
        moduleModels = OT2_MODULE_MODELS.filter(
          model =>
            getModuleType(model) !== HEATERSHAKER_MODULE_TYPE &&
            getModuleType(model) !== THERMOCYCLER_MODULE_TYPE
        )
      } else {
        moduleModels = OT2_MODULE_MODELS.filter(
          model => getModuleType(model) !== THERMOCYCLER_MODULE_TYPE
        )
      }
      break
    }
  }
  return moduleModels
}

export const getLabwareIsRecommended = (
  def: LabwareDefinition2,
  moduleModel?: ModuleModel | null
): boolean => {
  //  special-casing the thermocycler module V2 recommended labware since the thermocyclerModuleTypes
  //  have different recommended labware
  const moduleType = moduleModel != null ? getModuleType(moduleModel) : null
  if (moduleModel === THERMOCYCLER_MODULE_V2) {
    return (
      def.parameters.loadName === 'opentrons_96_wellplate_200ul_pcr_full_skirt'
    )
  } else {
    return moduleType != null
      ? RECOMMENDED_LABWARE_BY_MODULE[moduleType].includes(
          def.parameters.loadName
        )
      : false
  }
}

export const getLabwareCompatibleWithAdapter = (
  adapterLoadName?: string
): string[] => {
  const defs = getOnlyLatestDefs()

  if (adapterLoadName == null) {
    return []
  }

  return Object.entries(defs)
    .filter(
      ([, { stackingOffsetWithLabware }]) =>
        stackingOffsetWithLabware?.[adapterLoadName] != null
    )
    .map(([labwareDefUri]) => labwareDefUri)
}

interface Ot2HeaterShakerDeckErrorsProps {
  modules: InitialDeckSetup['modules']
  selectedSlot: string
  selectedModel: ModuleModel
}

export const getOt2HeaterShakerDeckErrors = (
  props: Ot2HeaterShakerDeckErrorsProps
): string | null => {
  const { selectedSlot, selectedModel, modules } = props

  let error = null

  const isModuleAdjacentToHeaterShaker =
    // if the module is a heater shaker, it can't be adjacent to another heater shaker
    // because PD does not support MoaM for OT-2
    getModuleType(selectedModel) !== HEATERSHAKER_MODULE_TYPE &&
    some(
      modules,
      hwModule =>
        hwModule.type === HEATERSHAKER_MODULE_TYPE &&
        getAreSlotsAdjacent(hwModule.slot, selectedSlot)
    )

  if (isModuleAdjacentToHeaterShaker) {
    error = 'heater_shaker_adjacent'
  } else if (getModuleType(selectedModel) === HEATERSHAKER_MODULE_TYPE) {
    const isHeaterShakerAdjacentToAnotherModule = some(
      modules,
      hwModule =>
        getAreSlotsAdjacent(hwModule.slot, selectedSlot) &&
        // if the other module is a heater shaker it's the same heater shaker (reflecting current state)
        // since the form has not been saved yet and PD does not support MoaM for OT-2
        hwModule.type !== HEATERSHAKER_MODULE_TYPE
    )
    if (isHeaterShakerAdjacentToAnotherModule) {
      error = 'heater_shaker_adjacent_to'
    }
  }

  return error
}
