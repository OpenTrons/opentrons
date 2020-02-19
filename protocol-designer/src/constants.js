// @flow
import mapValues from 'lodash/mapValues'
import * as componentLib from '@opentrons/components'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  THERMOCYCLER,
  MAGDECK_MODEL_GEN1,
  // MAGDECK_MODEL_GEN2,
  TEMPDECK_MODEL_GEN1,
  // TEMPDECK_MODEL_GEN2,
  THERMOCYCLER_MODEL_GEN1,
} from '@opentrons/shared-data'
import type { Options } from '@opentrons/components'
import type {
  LabwareDefinition2,
  DeckSlot as DeckDefSlot,
  ModuleRealType,
} from '@opentrons/shared-data'
import type { DeckSlot, WellVolumes } from './types'
// TODO Ian 2018-11-27: import these from components lib, not from this constants file
export const {
  // OT2 DECK CONSTANTS
  SLOTNAME_MATRIX,
  sortedSlotnames,
  TRASH_SLOTNAME,
  SLOT_SPACING_MM,
  // STYLE CONSTANTS
  swatchColors,
  // SPECIAL SELECTORS
  SELECTABLE_WELL_CLASS,
} = componentLib

export const getMaxVolumes = (def: LabwareDefinition2): WellVolumes =>
  mapValues(def.wells, well => well.totalLiquidVolume)

/** All wells for labware, in arbitrary order. */
export function getAllWellsForLabware(def: LabwareDefinition2): Array<string> {
  return Object.keys(def.wells)
}

export const FIXED_TRASH_ID: 'trashId' = 'trashId'

export const GEN_ONE_MULTI_PIPETTES = ['p10_multi', 'p50_multi', 'p300_multi']

// Standard slot dims FOR VISUALIZATION ONLY
export const STD_SLOT_X_DIM = 128
export const STD_SLOT_Y_DIM = 86
export const STD_SLOT_DIVIDER_WIDTH = 4

// PD-specific slots that don't exist in deck definition.
// These have no visual representation on the deck themselves,
// but may contain certain specific items that span (eg thermocycler)
export const SPAN7_8_10_11_SLOT: 'span7_8_10_11' = 'span7_8_10_11'
export const TC_SPAN_SLOTS: Array<DeckSlot> = ['7', '8', '10', '11']
export const PSEUDO_DECK_SLOTS: { [DeckSlot]: DeckDefSlot } = {
  [SPAN7_8_10_11_SLOT]: {
    displayName: 'Spanning slot',
    id: SPAN7_8_10_11_SLOT,
    position: [0.0, 181.0, 0.0], // shares origin with OT2 standard slot 7
    matingSurfaceUnitVector: [-1, 1, -1],
    boundingBox: {
      xDimension: STD_SLOT_X_DIM * 2 + STD_SLOT_DIVIDER_WIDTH,
      yDimension: STD_SLOT_Y_DIM * 2 + STD_SLOT_DIVIDER_WIDTH,
      zDimension: 0,
    },
    // !!! TODO IMMEDIATELY make sure compatibleModules matches update from Seth's PR,
    // or make separate ticket to update this pseudo-slot
    compatibleModules: [THERMOCYCLER],
  },
}

export const START_TERMINAL_TITLE = 'STARTING DECK STATE'
export const END_TERMINAL_TITLE = 'FINAL DECK STATE'

// special ID for invisible deck setup step-form
export const INITIAL_DECK_SETUP_STEP_ID = '__INITIAL_DECK_SETUP_STEP__'

export const DEFAULT_CHANGE_TIP_OPTION: 'always' = 'always'

// TODO: Ian 2019-06-13 don't keep these as hard-coded static values (see #3587)
export const DEFAULT_MM_FROM_BOTTOM_ASPIRATE = 1
export const DEFAULT_MM_FROM_BOTTOM_DISPENSE = 0.5
// NOTE: in the negative Z direction, to go down from top
export const DEFAULT_MM_TOUCH_TIP_OFFSET_FROM_TOP = -1
export const DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP = 0

export const DEFAULT_WELL_ORDER_FIRST_OPTION: 't2b' = 't2b'
export const DEFAULT_WELL_ORDER_SECOND_OPTION: 'l2r' = 'l2r'

export const MIN_ENGAGE_HEIGHT = -4
export const MAX_ENGAGE_HEIGHT = 16

export const MIN_TEMP_MODULE_TEMP = 0
export const MAX_TEMP_MODULE_TEMP = 95

// Temperature statuses
export const TEMPERATURE_DEACTIVATED: 'TEMPERATURE_DEACTIVATED' =
  'TEMPERATURE_DEACTIVATED'
export const TEMPERATURE_AT_TARGET: 'TEMPERATURE_AT_TARGET' =
  'TEMPERATURE_AT_TARGET'
export const TEMPERATURE_APPROACHING_TARGET: 'TEMPERATURE_APPROACHING_TARGET' =
  'TEMPERATURE_APPROACHING_TARGET'

export const MODELS_FOR_MODULE_TYPE: { [ModuleRealType]: Options } = {
  [MAGNETIC_MODULE_TYPE]: [
    { name: 'GEN1', value: MAGDECK_MODEL_GEN1 },
    // TODO: IL 2019-01-31 enable this to support Magnetic Module GEN2 in PD
    // { name: 'GEN2', value: MAGDECK_MODEL_GEN2 },
  ],
  [TEMPERATURE_MODULE_TYPE]: [
    { name: 'GEN1', value: TEMPDECK_MODEL_GEN1 },
    // TODO: IL 2019-01-31 enable this to support Temperature Module GEN2 in PD
    // { name: 'GEN2', value: TEMPDECK_MODEL_GEN2 },
  ],
  [THERMOCYCLER_MODULE_TYPE]: [
    { name: 'GEN1', value: THERMOCYCLER_MODEL_GEN1 },
  ],
}

export const DEFAULT_MODEL_FOR_MODULE_TYPE: { [ModuleRealType]: string } = {
  [MAGNETIC_MODULE_TYPE]: MAGDECK_MODEL_GEN1,
  [TEMPERATURE_MODULE_TYPE]: TEMPDECK_MODEL_GEN1,
  [THERMOCYCLER_MODULE_TYPE]: THERMOCYCLER_MODEL_GEN1,
}

export const PAUSE_UNTIL_RESUME: 'untilResume' = 'untilResume'
export const PAUSE_UNTIL_TIME: 'untilTime' = 'untilTime'
export const PAUSE_UNTIL_TEMP: 'untilTemperature' = 'untilTemperature'
