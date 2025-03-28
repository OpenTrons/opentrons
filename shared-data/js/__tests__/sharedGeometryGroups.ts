/** Labware that are expected to have the exact same inner well geometry. */
export const SHARED_GEOMETRY_GROUPS: SharedGeometryGroups = {
  falcon_15ml_conical: [
    {
      loadName: 'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical',
      geometryKey: '15mlconicalWell',
    },
    'opentrons_15_tuberack_falcon_15ml_conical',
  ],
  falcon_50ml_conical: [
    {
      loadName: 'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical',
      geometryKey: '50mlconicalWell',
    },
    'opentrons_6_tuberack_falcon_50ml_conical',
  ],
  generic_2ml_screwcap: [
    'opentrons_24_aluminumblock_generic_2ml_screwcap',
    'opentrons_24_tuberack_generic_2ml_screwcap',
  ],
  'nest_0.5ml_screwcap': [
    'opentrons_24_aluminumblock_nest_0.5ml_screwcap',
    'opentrons_24_tuberack_nest_0.5ml_screwcap',
  ],
  'nest_1.5ml_screwcap': [
    'opentrons_24_aluminumblock_nest_1.5ml_screwcap',
    'opentrons_24_tuberack_nest_1.5ml_screwcap',
  ],
  'nest_1.5ml_snapcap': [
    'opentrons_24_aluminumblock_nest_1.5ml_snapcap',
    'opentrons_24_tuberack_nest_1.5ml_snapcap',
  ],
  nest_2ml_screwcap: [
    'opentrons_24_aluminumblock_nest_2ml_screwcap',
    'opentrons_24_tuberack_nest_2ml_screwcap',
  ],
  nest_2ml_snapcap: [
    'opentrons_24_aluminumblock_nest_2ml_snapcap',
    'opentrons_24_tuberack_nest_2ml_snapcap',
  ],
  nest_15ml_conical: [
    {
      loadName: 'opentrons_10_tuberack_nest_4x50ml_6x15ml_conical',
      geometryKey: 'conicalWell15mL',
    },
    'opentrons_15_tuberack_nest_15ml_conical',
  ],
  nest_50ml_conical: [
    {
      loadName: 'opentrons_10_tuberack_nest_4x50ml_6x15ml_conical',
      geometryKey: 'conicalWell50mL',
    },
    'opentrons_6_tuberack_nest_50ml_conical',
  ],
}

interface SharedGeometryGroups {
  [humanReadableGroupName: string]: SharedGeometryEntry[]
}

/**
 * If a plain string, the string is the load name of the labware. In this case, the
 * labware must have exactly one key within innerLabwareGeometry.
 *
 * If an object, the object contains the load name and the specific key within
 * innerLabwareGeometry. */
export type SharedGeometryEntry =
  | string
  | {
      loadName: string
      geometryKey: string
    }
