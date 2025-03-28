import {
  getModuleDisplayName,
  getModuleType,
  getOccludedSlotCountForModule,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
  FLEX_STACKER_MODULE_V1,
  TRASH_BIN_FIXTURE,
  WASTE_CHUTE_ADDRESSABLE_AREAS,
  MOVABLE_TRASH_ADDRESSABLE_AREAS,
} from '@opentrons/shared-data'
import {
  getLabwareLocation,
  getLabwareLocationFromSequence,
} from './getLabwareLocation'

import type { TFunction } from 'i18next'
import type {
  LocationFullParams,
  LocationSlotOnlyParams,
} from './getLabwareLocation'
import type {
  AddressableAreaName,
  LabwareLocation,
  LabwareLocationSequence,
} from '@opentrons/shared-data'

export interface DisplayLocationSlotOnlyParams
  extends Omit<LocationSlotOnlyParams, 'location'> {
  t: TFunction
  isOnDevice?: boolean
  location?: LabwareLocation | LabwareLocationSequence | null
}
export interface DisplayLocationFullParams
  extends Omit<LocationFullParams, 'location'> {
  t: TFunction
  isOnDevice?: boolean
  location?: LabwareLocation | LabwareLocationSequence | null
}
export type DisplayLocationParams =
  | DisplayLocationSlotOnlyParams
  | DisplayLocationFullParams

// detailLevel applies to nested labware. If 'full', return copy that includes the actual peripheral that nests the
// labware, ex, "in module XYZ in slot C1".
// If 'slot-only', return only the slot name, ex "in slot C1".
export function getLabwareDisplayLocation(
  params: DisplayLocationParams
): string {
  const { t, isOnDevice = false, location } = params
  const locationResult = Array.isArray(location)
    ? getLabwareLocationFromSequence({
        ...params,
        locationSequence: location,
      })
    : getLabwareLocation({
        ...params,
        location: location ?? null,
      })
  if (locationResult == null) {
    return ''
  }

  const { slotName: initialSlotName, moduleModel, adapterName } = locationResult
  const slotName =
    moduleModel === THERMOCYCLER_MODULE_V1 ||
    moduleModel === THERMOCYCLER_MODULE_V2
      ? 'A1+B1'
      : initialSlotName

  if (slotName === 'offDeck' || slotName === 'systemLocation') {
    return t('off_deck')
  } else if (slotName === 'systemLocation') {
    // returning system location for slot name which we'll use to swap out
    // run log copy, this should never reach the user
    return slotName
  }
  // Simple slot location
  else if (moduleModel == null && adapterName == null) {
    const validatedSlotCopy = handleSpecialSlotNames(slotName, t)
    return isOnDevice ? validatedSlotCopy.odd : validatedSlotCopy.desktop
  }
  // Module location without adapter
  else if (moduleModel != null && adapterName == null) {
    if (params.detailLevel === 'slot-only') {
      switch (moduleModel) {
        case THERMOCYCLER_MODULE_V1:
        case THERMOCYCLER_MODULE_V2:
          return t('slot', { slot_name: 'A1+B1' })
        case FLEX_STACKER_MODULE_V1:
          if (slotName === 'D3') {
            return t('stacker_display_name', { stacker_slot: 'A' })
          } else if (slotName === 'C3') {
            return t('stacker_display_name', { stacker_slot: 'B' })
          } else if (slotName === 'B3') {
            return t('stacker_display_name', { stacker_slot: 'C' })
          } else return t('stacker_display_name', { stacker_slot: 'D' })

        default:
          return t('slot', { slot_name: slotName })
      }
    } else {
      return isOnDevice
        ? `${getModuleDisplayName(moduleModel)}, ${slotName}`
        : t('module_in_slot', {
            count: getOccludedSlotCountForModule(
              getModuleType(moduleModel),
              params.robotType
            ),
            module: getModuleDisplayName(moduleModel),
            slot_name: slotName,
          })
    }
  }
  // Adapter locations
  else if (adapterName != null) {
    if (moduleModel == null) {
      return t('adapter_in_slot', {
        adapter: adapterName,
        slot: slotName,
      })
    } else {
      return t('adapter_in_mod_in_slot', {
        count: getOccludedSlotCountForModule(
          getModuleType(moduleModel),
          params.robotType
        ),
        module: getModuleDisplayName(moduleModel),
        adapter: adapterName,
        slot: slotName,
      })
    }
  } else {
    return ''
  }
}

// Sometimes we don't want to show the actual slotName, so we special case the text here.
function handleSpecialSlotNames(
  slotName: string,
  t: TFunction
): { odd: string; desktop: string } {
  if (WASTE_CHUTE_ADDRESSABLE_AREAS.includes(slotName as AddressableAreaName)) {
    return { odd: t('waste_chute'), desktop: t('waste_chute') }
  } else if (
    slotName === TRASH_BIN_FIXTURE ||
    MOVABLE_TRASH_ADDRESSABLE_AREAS.includes(slotName as AddressableAreaName)
  ) {
    return { odd: t('trash_bin'), desktop: t('trash_bin') }
  } else {
    return {
      odd: slotName,
      desktop: t('slot', { slot_name: slotName }),
    }
  }
}
