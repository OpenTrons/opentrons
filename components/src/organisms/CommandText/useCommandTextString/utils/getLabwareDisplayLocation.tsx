import {
  getModuleDisplayName,
  getModuleType,
  getOccludedSlotCountForModule,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
  TRASH_BIN_FIXTURE,
  WASTE_CHUTE_ADDRESSABLE_AREAS,
} from '@opentrons/shared-data'
import { getLabwareLocation } from './getLabwareLocation'

import type { TFunction } from 'i18next'

import type { AddressableAreaName } from '@opentrons/shared-data'
import type {
  LocationFullParams,
  LocationSlotOnlyParams,
} from './getLabwareLocation'

export interface DisplayLocationSlotOnlyParams extends LocationSlotOnlyParams {
  t: TFunction
  isOnDevice?: boolean
}

export interface DisplayLocationFullParams extends LocationFullParams {
  t: TFunction
  isOnDevice?: boolean
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
  const { t, isOnDevice = false } = params
  const locationResult = getLabwareLocation(params)

  if (locationResult == null) {
    return ''
  }

  const { slotName, moduleModel, adapterName } = locationResult

  if (slotName === 'offDeck' || slotName === 'systemLocation') {
    return t('off_deck')
  }
  // Simple slot location
  else if (moduleModel == null && adapterName == null) {
    const validatedSlotCopy = handleSpecialSlotNames(slotName, t)
    return isOnDevice ? validatedSlotCopy.odd : validatedSlotCopy.desktop
  }
  // Module location without adapter
  else if (moduleModel != null && adapterName == null) {
    if (params.detailLevel === 'slot-only') {
      return moduleModel === THERMOCYCLER_MODULE_V1 ||
        moduleModel === THERMOCYCLER_MODULE_V2
        ? t('slot', { slot_name: 'A1+B1' })
        : t('slot', { slot_name: slotName })
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
  } else if (slotName === TRASH_BIN_FIXTURE) {
    return { odd: t('trash_bin'), desktop: t('trash_bin') }
  } else {
    return {
      odd: slotName,
      desktop: t('slot', { slot_name: slotName }),
    }
  }
}
