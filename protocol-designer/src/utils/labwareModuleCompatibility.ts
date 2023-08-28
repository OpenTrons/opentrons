// PD-specific info about labware<>module compatibilty
import assert from 'assert'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  LabwareDefinition2,
  ModuleType,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
} from '@opentrons/shared-data'
import { LabwareDefByDefURI } from '../labware-defs'
import { LabwareOnDeck } from '../step-forms'
// NOTE: this does not distinguish btw versions. Standard labware only (assumes namespace is 'opentrons')
export const COMPATIBLE_LABWARE_ALLOWLIST_BY_MODULE_TYPE: Record<
  ModuleType,
  Readonly<string[]>
> = {
  [TEMPERATURE_MODULE_TYPE]: [
    'eppendorf_6_wellplate_16.8ml_flat',
    'agilent_24_wellplate_10ml_flat',
    'corning_6_wellplate_16.8ml_flat',
    'corning_12_wellplate_6.9ml_flat',
    'corning_24_wellplate_3.4ml_flat',
    'corning_48_wellplate_1.6ml_flat',
    'corning_96_wellplate_360ul_flat',
    'corning_384_wellplate_112ul_flat',
    'biorad_96_wellplate_200ul_pcr',
    'opentrons_24_aluminumblock_generic_2ml_screwcap',
    'opentrons_96_aluminumblock_generic_pcr_strip_200ul',
    'usascientific_12_reservoir_22ml', // 'biotix_1_well_reservoir_?ml', // TODO: Ian 2019-10-29 this is in the doc but doesn't exist
    'usascientific_96_wellplate_2.4ml_deep',
    'agilent_1_reservoir_290ml',
    'axygen_1_reservoir_90ml',
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_200ul_flat',
    'opentrons_24_aluminumblock_nest_1.5ml_screwcap',
    'opentrons_24_aluminumblock_nest_1.5ml_snapcap',
    'opentrons_24_aluminumblock_nest_2ml_screwcap',
    'opentrons_24_aluminumblock_nest_2ml_snapcap',
    'opentrons_24_aluminumblock_nest_0.5ml_screwcap',
    'opentrons_96_well_aluminum_block',
  ],
  [MAGNETIC_MODULE_TYPE]: [
    'biorad_96_wellplate_200ul_pcr',
    'usascientific_96_wellplate_2.4ml_deep',
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_2ml_deep',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
  [THERMOCYCLER_MODULE_TYPE]: [
    'biorad_96_wellplate_200ul_pcr',
    'nest_96_wellplate_100ul_pcr_full_skirt',
  ],
  [HEATERSHAKER_MODULE_TYPE]: [
    'opentrons_96_deep_well_adapter',
    'opentrons_96_flat_bottom_adapter',
    'opentrons_96_pcr_adapter',
    'opentrons_universal_flat_adapter',
  ],
  [MAGNETIC_BLOCK_TYPE]: [
    'nest_96_wellplate_100ul_pcr_full_skirt',
    'nest_96_wellplate_2ml_deep',
    'opentrons_96_wellplate_200ul_pcr_full_skirt',
  ],
}
export const getLabwareIsCompatible = (
  def: LabwareDefinition2,
  moduleType: ModuleType
): boolean => {
  assert(
    moduleType in COMPATIBLE_LABWARE_ALLOWLIST_BY_MODULE_TYPE,
    `expected ${moduleType} in labware<>module compatibility allowlist`
  )
  const allowlist =
    COMPATIBLE_LABWARE_ALLOWLIST_BY_MODULE_TYPE[moduleType] || []
  return allowlist.includes(def.parameters.loadName)
}

const DEEP_WELL_ADAPTER_LOADNAME = 'opentrons_96_deep_well_adapter'
const FLAT_BOTTOM_ADAPTER_LOADNAME = 'opentrons_96_flat_bottom_adapter'
const PCR_ADAPTER_LOADNAME = 'opentrons_96_pcr_adapter'
const UNIVERSAL_FLAT_ADAPTER_LOADNAME = 'opentrons_universal_flat_adapter'
const ALUMINUM_BLOCK_96_LOADNAME = 'opentrons_96_well_aluminum_block'

export const COMPATIBLE_LABWARE_ALLOWLIST_FOR_ADAPTER: Record<
  string,
  string[]
> = {
  [DEEP_WELL_ADAPTER_LOADNAME]: [
    'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
  ],
  [FLAT_BOTTOM_ADAPTER_LOADNAME]: ['opentrons/nest_96_wellplate_200ul_flat/2'],
  [PCR_ADAPTER_LOADNAME]: [
    'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
  ],
  [UNIVERSAL_FLAT_ADAPTER_LOADNAME]: [
    'opentrons/corning_384_wellplate_112ul_flat/2',
  ],
  [ALUMINUM_BLOCK_96_LOADNAME]: [
    'opentrons/biorad_96_wellplate_200ul_pcr/2',
    'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
  ],
}

export const getLabwareCompatibleWithAdapter = (
  adapterLoadName?: string
): string[] =>
  adapterLoadName != null
    ? COMPATIBLE_LABWARE_ALLOWLIST_FOR_ADAPTER[adapterLoadName]
    : []

export const getLabwareIsCustom = (
  customLabwares: LabwareDefByDefURI,
  labwareOnDeck: LabwareOnDeck
): boolean => {
  return labwareOnDeck.labwareDefURI in customLabwares
}

export const getAdapterLabwareIsAMatch = (
  labwareId: string,
  allLabware: LabwareOnDeck[],
  draggedLabwareLoadname: string
): boolean => {
  const loadName = Object.values(allLabware).find(lab => lab.id === labwareId)
    ?.def.parameters.loadName

  const deepWellPair =
    loadName === DEEP_WELL_ADAPTER_LOADNAME &&
    draggedLabwareLoadname === 'nest_96_wellplate_2ml_deep'
  const flatBottomPair =
    loadName === FLAT_BOTTOM_ADAPTER_LOADNAME &&
    draggedLabwareLoadname === 'nest_96_wellplate_200ul_flat'
  const pcrPair =
    loadName === PCR_ADAPTER_LOADNAME &&
    draggedLabwareLoadname === 'nest_96_wellplate_100ul_pcr_full_skirt'
  const universalPair =
    loadName === UNIVERSAL_FLAT_ADAPTER_LOADNAME &&
    draggedLabwareLoadname === 'corning_384_wellplate_112ul_flat'
  const aluminumBlock96Pairs =
    loadName === ALUMINUM_BLOCK_96_LOADNAME &&
    (draggedLabwareLoadname === 'biorad_96_wellplate_200ul_pcr' ||
      draggedLabwareLoadname === 'nest_96_wellplate_100ul_pcr_full_skirt')

  if (
    deepWellPair ||
    flatBottomPair ||
    pcrPair ||
    universalPair ||
    aluminumBlock96Pairs
  ) {
    return true
  } else {
    return false
  }
}
