// @flow

// constants for dealing with robot coordinate system (eg in labwareTools)
export const SLOT_LENGTH_MM = 127.76 // along X axis in robot coordinate system
export const SLOT_WIDTH_MM = 85.48 // along Y axis in robot coordinate system

// constants for SVG renders of the deck
export const SLOT_RENDER_WIDTH = SLOT_LENGTH_MM // along X axis in SVG coords
export const SLOT_RENDER_HEIGHT = SLOT_WIDTH_MM // along Y axis in SVG coords

// taken from opentrons_1_trash_1100ml_fixed v1's dimensions
export const FIXED_TRASH_RENDER_HEIGHT = 165.86 // along Y axis in SVG coords

export const OPENTRONS_LABWARE_NAMESPACE = 'opentrons'

// TODO: IL 2020-02-19 These 3 constants are DEPRECATED because they're ambiguous model vs type.
export const THERMOCYCLER: 'thermocycler' = 'thermocycler'
export const TEMPDECK: 'tempdeck' = 'tempdeck'
export const MAGDECK: 'magdeck' = 'magdeck'
// these are the v2 equivalents of the above. They should match the names of definitions
export const MAGNETIC_MODULE_V1: 'magneticModuleV1' = 'magneticModuleV1'
export const MAGNETIC_MODULE_V2: 'magneticModuleV2' = 'magneticModuleV2'
export const TEMPERATURE_MODULE_V1: 'temperatureModuleV1' =
  'temperatureModuleV1'
export const TEMPERATURE_MODULE_V2: 'temperatureModuleV2' =
  'temperatureModuleV2'
export const THERMOCYCLER_MODULE_V1: 'thermocyclerModuleV1' =
  'thermocyclerModuleV1'

// pipette display categories
export const GEN2: 'GEN2' = 'GEN2'
export const GEN1: 'GEN1' = 'GEN1'

// NOTE: these are NOT module MODELs, they are `moduleType`s. Should match ENUM in module definition file.
export const TEMPERATURE_MODULE_TYPE: 'temperatureModuleType' =
  'temperatureModuleType'
export const MAGNETIC_MODULE_TYPE: 'magneticModuleType' = 'magneticModuleType'
export const THERMOCYCLER_MODULE_TYPE: 'thermocyclerModuleType' =
  'thermocyclerModuleType'

export const MODULE_MODELS = [
  MAGNETIC_MODULE_V1,
  MAGNETIC_MODULE_V2,
  TEMPERATURE_MODULE_V1,
  TEMPERATURE_MODULE_V2,
  THERMOCYCLER_MODULE_V1,
]

// offset added to parameters.magneticModuleEngageHeight for displaying reccomended height in PD
export const ENGAGE_HEIGHT_OFFSET = -4

export const MODULE_TYPES = [
  TEMPERATURE_MODULE_TYPE,
  MAGNETIC_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
]
