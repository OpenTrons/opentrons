// @flow
import assert from 'assert'
import mapValues from 'lodash/mapValues'
import uniq from 'lodash/uniq'
// TODO: Ian 2019-06-04 remove the shared-data build process for labware v1
import definitions from '../build/labware.json'
import { SLOT_RENDER_HEIGHT, FIXED_TRASH_RENDER_HEIGHT } from './constants'
import type {
  LabwareDefinition,
  LabwareDefinition2,
  WellDefinition,
} from './types'

assert(
  definitions && Object.keys(definitions).length > 0,
  'Expected v1 labware defs. Something went wrong with shared-data/build/labware.json'
)

// labware definitions only used for back-compat with legacy v1 defs.
// do not list in any "available labware" UI.
export const LABWAREV2_DO_NOT_LIST = [
  'opentrons_40_aluminumblock_eppendorf_24x2ml_safelock_snapcap_generic_16x0.2ml_pcr_strip',
  'opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap_acrylic',
  'opentrons_24_tuberack_generic_0.75ml_snapcap_acrylic',
  'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical_acrylic',
  'tipone_96_tiprack_200ul',
  'opentrons_1_trash_850ml_fixed',
  'opentrons_1_trash_1100ml_fixed',
]

export function getLabware(labwareName: string): ?LabwareDefinition {
  const labware: ?LabwareDefinition = definitions[labwareName]
  return labware
}

// TODO: Ian 2019-04-11 DEPRECATED REMOVE
export function getIsTiprackDeprecated(labwareName: string): boolean {
  const labware = getLabware(labwareName)
  return Boolean(labware && labware.metadata && labware.metadata.isTiprack)
}

export function getIsTiprack(labwareDef: LabwareDefinition2): boolean {
  return labwareDef.parameters.isTiprack
}

/* Render Helpers */

// NOTE: this doesn't account for the differing footprints of labware
// the fixed trash render height is the first bandaid to partially
// mend this, but overall the labware definitions in shared-data are
// insufficient to render labware at the resolution we'd like to
// achieve going forward.

// TODO: BC 2019-02-28 The height constants used here should be replaced with the heights
// in the dimensions field of the corresponding labware in definitions
const _getSvgYValueForWell = (labwareName: string, wellDef: WellDefinition) => {
  const renderHeight =
    labwareName === 'fixed-trash'
      ? FIXED_TRASH_RENDER_HEIGHT
      : SLOT_RENDER_HEIGHT
  return renderHeight - wellDef.y
}

// TODO IMMEDIATELY: DEPRECATED, remove
/** For display. Flips Y axis to match SVG, applies offset to wells */
export function getWellDefsForSVG(labwareName: string) {
  const labware = getLabware(labwareName)
  const wellDefs = labware && labware.wells

  // Most labware defs have a weird offset,
  // but tips are mostly OK.
  // This is a HACK to make the offset less "off"
  const isTiprack = getIsTiprackDeprecated(labwareName)
  let xCorrection = 0
  let yCorrection = 0
  if (!isTiprack) {
    xCorrection = 1
    yCorrection = -3
  }

  return mapValues(wellDefs, (wellDef: WellDefinition) => ({
    ...wellDef,
    x: wellDef.x + xCorrection,
    y: _getSvgYValueForWell(labwareName, wellDef) + yCorrection,
  }))
}

export const getLabwareDefURI = (def: LabwareDefinition2): string =>
  `${def.namespace}/${def.parameters.loadName}/${def.version}`

// NOTE: this is used in PD for converting "offset from top" to "mm from bottom".
// Assumes all wells have same offset because multi-offset not yet supported.
// TODO: Ian 2019-07-13 return {[string: well]: offset} to support multi-offset
export const getWellsDepth = (
  labwareDef: LabwareDefinition2,
  wells: Array<string>
): number => {
  const offsets = wells.map(well => labwareDef.wells[well].depth)
  if (uniq(offsets).length !== 1) {
    console.warn(
      `expected wells ${JSON.stringify(
        wells
      )} to all have same offset, but they were different. Labware def is ${getLabwareDefURI(
        labwareDef
      )}`
    )
  }

  return offsets[0]
}
