import {
  FLEX_SINGLE_SLOT_ADDRESSABLE_AREAS,
  FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS,
  OT2_SINGLE_SLOT_ADDRESSABLE_AREAS,
  MAGNETIC_BLOCK_ADDRESSABLE_AREAS,
  TEMPERATURE_MODULE_ADDRESSABLE_AREAS,
  HEATERSHAKER_ADDRESSABLE_AREAS,
  ABSORBANCE_READER_ADDRESSABLE_AREAS,
  FLEX_STACKER_ADDRESSABLE_AREAS,
  MAGNETIC_BLOCK_V1,
  TEMPERATURE_MODULE_V2,
  HEATERSHAKER_MODULE_V1,
  ABSORBANCE_READER_V1,
  FLEX_STACKER_MODULE_V1,
  THERMOCYCLER_ADDRESSABLE_AREA,
} from '../constants'
import type { ModuleModel } from '../types'
import type { AddressableAreaName } from '../../deck'

export function getSlotFromAddressableAreaName(
  addressableArea: AddressableAreaName
): string {
  if (
    [
      ...FLEX_SINGLE_SLOT_ADDRESSABLE_AREAS,
      ...FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS,
      ...OT2_SINGLE_SLOT_ADDRESSABLE_AREAS,
    ].includes(addressableArea as AddressableAreaName)
  ) {
    return addressableArea
  } else if (addressableArea === THERMOCYCLER_ADDRESSABLE_AREA) {
    return 'A1+B1'
  } else {
    const slotName = addressableArea.slice(-2)

    if (
      [
        ...FLEX_SINGLE_SLOT_ADDRESSABLE_AREAS,
        ...FLEX_STAGING_AREA_SLOT_ADDRESSABLE_AREAS,
        ...OT2_SINGLE_SLOT_ADDRESSABLE_AREAS,
      ].includes(slotName as AddressableAreaName)
    ) {
      return slotName
    }
  }
  return ''
}

export function getModuleModelFromAddressableArea(
  addressableArea: AddressableAreaName
): ModuleModel | null {
  if (MAGNETIC_BLOCK_ADDRESSABLE_AREAS.includes(addressableArea)) {
    return MAGNETIC_BLOCK_V1
  } else if (TEMPERATURE_MODULE_ADDRESSABLE_AREAS.includes(addressableArea)) {
    return TEMPERATURE_MODULE_V2
  } else if (HEATERSHAKER_ADDRESSABLE_AREAS.includes(addressableArea)) {
    return HEATERSHAKER_MODULE_V1
  } else if (ABSORBANCE_READER_ADDRESSABLE_AREAS.includes(addressableArea)) {
    return ABSORBANCE_READER_V1
  } else if (FLEX_STACKER_ADDRESSABLE_AREAS.includes(addressableArea)) {
    return FLEX_STACKER_MODULE_V1
  }
  return null
}
