import mapValues from 'lodash/mapValues'

import {
  FIXED_TRASH_RENDER_HEIGHT,
  OPENTRONS_LABWARE_NAMESPACE,
  SLOT_RENDER_HEIGHT,
} from './constants'

import type {
  LabwareDefinition1,
  LabwareDefinition2,
  WellDefinition,
} from './types'

// do not list in any "available labware" UI.
// TODO(mc, 2019-12-3): how should this correspond to RETIRED_LABWARE?
// see shared-data/js/helpers/index.js
export const LABWAREV2_DO_NOT_LIST = [
  // Labware definitions only used for back-compat with legacy v1 defs:
  'opentrons_40_aluminumblock_eppendorf_24x2ml_safelock_snapcap_generic_16x0.2ml_pcr_strip',
  'opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap_acrylic',
  'opentrons_24_tuberack_generic_0.75ml_snapcap_acrylic',
  'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical_acrylic',
  'tipone_96_tiprack_200ul',
  'eppendorf_96_tiprack_1000ul_eptips',
  'eppendorf_96_tiprack_10ul_eptips',
  // Replaced by opentrons_96_wellplate_200ul_pcr_full_skirt
  // (https://opentrons.atlassian.net/browse/RLAB-230):
  'armadillo_96_wellplate_200ul_pcr_full_skirt',
  'opentrons_96_pcr_adapter_armadillo_wellplate_200ul',
  // Special labware that users probably shouldn't know about or load:
  // these all should eventually be given a new namespace like "opentrons-internal"
  // so that they can be filtered out by namespace rather than a block list like this
  'opentrons_1_trash_850ml_fixed',
  'opentrons_1_trash_1100ml_fixed',
  'opentrons_1_trash_3200ml_fixed',
  'opentrons_calibrationblock_short_side_left',
  'opentrons_calibrationblock_short_side_right',
  'opentrons_calibration_adapter_heatershaker_module',
  'opentrons_calibration_adapter_temperature_module',
  'opentrons_calibration_adapter_thermocycler_module',
  'opentrons_ot3_96_tiprack_20ul',
  'opentrons_ot3_96_tiprack_200ul',
  'opentrons_ot3_96_tiprack_1000ul',
  'opentrons_ot3_96_tiprack_50ul',
  'opentrons_flex_lid_absorbance_plate_reader_module',
  // temporarily blocking evotips until it is out of beta
  'evotips_flex_96_tiprack_adapter',
  'evotips_opentrons_96_labware',
  // temporarily blocking tiprack lids until stacker launches
  'opentrons_flex_tiprack_lid',
  // temporarily blocking 20 uL Flex tip racks until they launch
  'opentrons_flex_96_tiprack_20ul',
  'opentrons_flex_96_filtertiprack_20ul',
]
// NOTE(sa, 2020-7-14): in PD we do not want to list calibration blocks
// or the adapter/labware combos since we migrated to splitting them up
export const PD_DO_NOT_LIST = [
  'opentrons_calibrationblock_short_side_left',
  'opentrons_calibrationblock_short_side_right',
  'opentrons_96_aluminumblock_biorad_wellplate_200ul',
  'opentrons_96_aluminumblock_nest_wellplate_100ul',
  'opentrons_universal_flat_adapter_corning_384_wellplate_112ul_flat',
  'opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt',
  'opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat',
  'opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep',
  'opentrons_96_pcr_adapter_armadillo_wellplate_200ul',
  //  temporarily blocking TC lid adapter and deck riser until it is supported in PD
  'opentrons_tough_pcr_auto_sealing_lid',
  'opentrons_flex_deck_riser',
  //  temporarily blocking evotips until it is supported in PD
  'evotips_flex_96_tiprack_adapter',
  'evotips_opentrons_96_labware',
  // temporarily blocking tiprack lids until stacker launches
  'opentrons_flex_tiprack_lid',
  // temporarily blocking 20 uL Flex tip racks until they launch
  'opentrons_flex_96_tiprack_20ul',
  'opentrons_flex_96_filtertiprack_20ul',
]

export function getIsLabwareV1Tiprack(def: LabwareDefinition1): boolean {
  return Boolean(def?.metadata?.isTiprack)
}

export function getIsTiprack(labwareDef: LabwareDefinition2): boolean {
  return labwareDef.parameters.isTiprack
}

// NOTE: these labware definitions in _SHORT_MM_LABWARE_DEF_LOADNAMES
// were written in "short mm" = 0.5mm, but
// we will write all future definitions in actual mm.
// These allowed labware also have engage heights measured from home switch
// instead of from labware bottom, which is why we add ENGAGE_HEIGHT_OFFSET.
//
// Ideally instead of using this allow-list, we would publish a new version
// of these definitions with corrected labware heights. However, we don't
// support labware versioning well enough yet.
const _SHORT_MM_LABWARE_DEF_LOADNAMES = [
  'biorad_96_wellplate_200ul_pcr',
  'nest_96_wellplate_100ul_pcr_full_skirt',
  'usascientific_96_wellplate_2.4ml_deep',
]

// offset added to parameters.magneticModuleEngageHeight to convert older labware
// definitions from "distance from home switch" to "distance from labware bottom"
// Note: this is in actual mm, not "short mm" :)
const ENGAGE_HEIGHT_OFFSET = -4

export function getLabwareDefaultEngageHeight(
  labwareDef: LabwareDefinition2
): number | null {
  const rawEngageHeight: number | null | undefined =
    labwareDef.parameters.magneticModuleEngageHeight

  if (
    labwareDef.namespace === OPENTRONS_LABWARE_NAMESPACE &&
    _SHORT_MM_LABWARE_DEF_LOADNAMES.includes(labwareDef.parameters.loadName)
  ) {
    return rawEngageHeight == null
      ? null
      : rawEngageHeight / 2 + ENGAGE_HEIGHT_OFFSET
  }

  return rawEngageHeight == null ? null : rawEngageHeight
}

/* Render Helpers */
// NOTE: this doesn't account for the differing footprints of labware
// the fixed trash render height is the first bandaid to partially
// mend this, but overall the labware definitions in shared-data are
// insufficient to render labware at the resolution we'd like to
// achieve going forward.
// TODO: BC 2019-02-28 The height constants used here should be replaced with the heights
// in the dimensions field of the corresponding labware in definitions
const _getSvgYValueForWell = (
  def: LabwareDefinition1,
  wellDef: WellDefinition
): number => {
  const labwareName = def.metadata.name
  const renderHeight =
    labwareName === 'fixed-trash'
      ? FIXED_TRASH_RENDER_HEIGHT
      : SLOT_RENDER_HEIGHT
  return renderHeight - wellDef.y
}

/** For display. Flips Y axis to match SVG, applies offset to wells */
export function getWellPropsForSVGLabwareV1(
  def: LabwareDefinition1
): Record<string, WellDefinition> {
  const wellDefs = def && def.wells
  // Most labware defs have a weird offset,
  // but tips are mostly OK.
  // This is a HACK to make the offset less "off"
  const isTiprack = getIsLabwareV1Tiprack(def)
  let xCorrection = 0
  let yCorrection = 0

  if (!isTiprack) {
    xCorrection = 1
    yCorrection = -3
  }

  return mapValues(wellDefs, (wellDef: WellDefinition) => ({
    ...wellDef,
    x: wellDef.x + xCorrection,
    y: _getSvgYValueForWell(def, wellDef) + yCorrection,
  }))
}
