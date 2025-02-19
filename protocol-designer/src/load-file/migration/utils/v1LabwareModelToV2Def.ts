import { getOnlyLatestDefs } from '/protocol-designer/labware-defs'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
const v1ModelTov2LoadNameMap = {
  '6-well-plate': 'corning_6_wellplate_16.8ml_flat',
  '12-well-plate': 'corning_12_wellplate_6.9ml_flat',
  '24-well-plate': 'corning_24_wellplate_3.4ml_flat',
  '48-well-plate': 'corning_48_wellplate_1.6ml_flat',
  '384-plate': 'corning_384_wellplate_112ul_flat',
  '96-deep-well': 'usascientific_96_wellplate_2.4ml_deep',
  '96-flat': 'corning_96_wellplate_360ul_flat',
  '96-PCR-flat': 'biorad_96_wellplate_200ul_pcr',
  '96-PCR-tall': 'biorad_96_wellplate_200ul_pcr',
  'biorad-hardshell-96-PCR': 'biorad_96_wellplate_200ul_pcr',
  'fixed-trash': 'opentrons_1_trash_1100ml_fixed',
  'opentrons-aluminum-block-2ml-eppendorf':
    'opentrons_24_aluminumblock_generic_2ml_screwcap',
  'opentrons-aluminum-block-2ml-screwcap':
    'opentrons_24_aluminumblock_generic_2ml_screwcap',
  'opentrons-aluminum-block-96-PCR-plate':
    'opentrons_96_aluminumblock_biorad_wellplate_200ul',
  'opentrons-aluminum-block-PCR-strips-200ul':
    'opentrons_96_aluminumblock_generic_pcr_strip_200ul',
  'opentrons-tiprack-300ul': 'opentrons_96_tiprack_300ul',
  'opentrons-tuberack-1.5ml-eppendorf':
    'opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap',
  'opentrons-tuberack-15_50ml':
    'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical',
  'opentrons-tuberack-15ml': 'opentrons_15_tuberack_falcon_15ml_conical',
  'opentrons-tuberack-2ml-eppendorf':
    'opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap',
  'opentrons-tuberack-2ml-screwcap':
    'opentrons_24_tuberack_generic_2ml_screwcap',
  'opentrons-tuberack-50ml': 'opentrons_6_tuberack_falcon_50ml_conical',
  'PCR-strip-tall': 'opentrons_96_aluminumblock_generic_pcr_strip_200ul',
  'tiprack-10ul': 'opentrons_96_tiprack_10ul',
  'tiprack-200ul': 'tipone_96_tiprack_200ul',
  'tiprack-1000ul': 'opentrons_96_tiprack_1000ul',
  'trash-box': 'agilent_1_reservoir_290ml',
  'trough-12row': 'usascientific_12_reservoir_22ml',
  'tube-rack-.75ml': 'opentrons_24_tuberack_generic_0.75ml_snapcap_acrylic',
  'tube-rack-2ml':
    'opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap_acrylic',
  'tube-rack-15_50ml':
    'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical_acrylic',
}
export function v1LabwareModelToV2Def(model: string): LabwareDefinition2 {
  // @ts-expect-error string cannot be used to index type
  const loadName: string | null | undefined = v1ModelTov2LoadNameMap[model]

  if (!loadName) {
    throw new Error(`expected a v2 loadName for v1 labware model "${model}"`)
  }

  const latestDefs = getOnlyLatestDefs()
  const uri: string | null | undefined = Object.keys(latestDefs).find(
    defURI => latestDefs[defURI].parameters.loadName === loadName
  )

  if (!uri) {
    throw new Error(`expected a v2 loadName for v1 labware model "${model}"`)
  }

  const def = latestDefs[uri]
  return def
}
