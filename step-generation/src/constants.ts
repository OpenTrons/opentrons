import {
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_V1,
} from '@opentrons/shared-data'
// Temperature statuses
export const TEMPERATURE_DEACTIVATED: 'TEMPERATURE_DEACTIVATED' =
  'TEMPERATURE_DEACTIVATED'
export const TEMPERATURE_AT_TARGET: 'TEMPERATURE_AT_TARGET' =
  'TEMPERATURE_AT_TARGET'
export const TEMPERATURE_APPROACHING_TARGET: 'TEMPERATURE_APPROACHING_TARGET' =
  'TEMPERATURE_APPROACHING_TARGET'
export const AIR_GAP_OFFSET_FROM_TOP = 1
export const MODULES_WITH_COLLISION_ISSUES = [
  MAGNETIC_MODULE_V1,
  TEMPERATURE_MODULE_V1,
]
export const FIXED_TRASH_ID: 'trashId' = 'trashId'
