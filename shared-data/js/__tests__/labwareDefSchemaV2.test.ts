import path from 'path'
import glob from 'glob'
import Ajv from 'ajv'
import { describe, expect, it, beforeAll, test } from 'vitest'

import schema from '../../labware/schemas/2.json'
import type {
  InnerWellGeometry,
  LabwareDefinition2,
  LabwareWell,
} from '../types'
import { SHARED_GEOMETRY_GROUPS } from './sharedGeometryGroups'
import range from 'lodash/range'

const definitionsDir = path.join(__dirname, '../../labware/definitions/2')
const fixturesDir = path.join(__dirname, '../../labware/fixtures/2')
const globPattern = '**/*.json'

// JSON Schema definition & setup
const ajv = new Ajv({ allErrors: true, jsonPointers: true })
const validate = ajv.compile(schema)

const generateStandardWellNames = (
  rowCount: number,
  columnCount: number
): Set<string> => {
  const result = new Set<string>()

  for (let column = 0; column < columnCount; column++) {
    for (let row = 0; row < rowCount; row++) {
      const columnName = (column + 1).toString()
      const rowName = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[row]
      result.add(rowName + columnName)
    }
  }

  return result
}

const standard24WellNames = generateStandardWellNames(4, 6)
const standard96WellNames = generateStandardWellNames(8, 12)
const standard384WellNames = generateStandardWellNames(16, 24)

// Wells whose tops lie above the labware's zDimension.
// These are known bugs in the labware definition. See Jira RSS-202.
const expectedWellsHigherThanZDimension: Record<string, Set<string>> = {
  'geb_96_tiprack_10ul/1.json': standard96WellNames,
  'opentrons_24_aluminumblock_generic_2ml_screwcap/1.json': standard24WellNames,
  'opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap/1.json': standard24WellNames,
  'opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap/2.json': standard24WellNames,
  'opentrons_96_aluminumblock_generic_pcr_strip_200ul/1.json': standard96WellNames,
  'opentrons_96_filtertiprack_200ul/1.json': standard96WellNames,
  'opentrons_96_tiprack_300ul/1.json': standard96WellNames,
}

// Wells whose tops do not lie exactly at the labware's zDimension.
//
// There are legitimate reasons for this to happen, but it can also be a dangerous bug
// in the labware definition. So if it happens, it needs to be justified here.
const expectedWellsNotMatchingZDimension: Record<string, Set<string>> = {
  ...expectedWellsHigherThanZDimension,

  // These height mismatches are legitimate.
  // These tube racks simultaneously hold tubes of different heights.
  // The labware's zDimension should match the height of the taller tubes,
  // not the shorter tubes listed here.
  'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical/1.json': new Set([
    'A3',
    'B3',
    'A4',
    'B4',
  ]),
  'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical/2.json': new Set([
    'A3',
    'B3',
    'A4',
    'B4',
  ]),
  'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical_acrylic/1.json': new Set([
    'A3',
    'B3',
    'A4',
    'B4',
  ]),
  'opentrons_10_tuberack_nest_4x50ml_6x15ml_conical/1.json': new Set([
    'A3',
    'B3',
    'A4',
    'B4',
  ]),
  'opentrons_10_tuberack_nest_4x50ml_6x15ml_conical/2.json': new Set([
    'A3',
    'B3',
    'A4',
    'B4',
  ]),

  // This is probably legitimate. Heterogeneous tubes.
  'opentrons_40_aluminumblock_eppendorf_24x2ml_safelock_snapcap_generic_16x0.2ml_pcr_strip/1.json': new Set(
    [
      'A3',
      'B3',
      'C3',
      'D3',
      'A4',
      'B4',
      'C4',
      'D4',
      'A5',
      'B5',
      'C5',
      'D5',
      'A6',
      'B6',
      'C6',
      'D6',
      'A7',
      'B7',
      'C7',
      'D7',
      'A8',
      'B8',
      'C8',
      'D8',
    ]
  ),

  // These height mismatches are legitimate. The zDimension should match the taller side.
  'opentrons_calibrationblock_short_side_left/1.json': new Set(['A1']),
  'opentrons_calibrationblock_short_side_right/1.json': new Set(['A2']),

  // this labware has a lip
  'evotips_opentrons_96_labware/2.json': standard96WellNames,

  // Presumably a bug. Fixed in v3 of this labware.
  'nest_1_reservoir_195ml/1.json': new Set(['A1']),
  'nest_1_reservoir_195ml/2.json': new Set(['A1']),

  // These were probably bugs, but it's moot now, since these adapter+wellplate
  // combo-definitions have been superseded by proper labware stacking.
  'opentrons_96_flat_bottom_adapter_nest_wellplate_200ul_flat/1.json': standard96WellNames,
  'opentrons_96_pcr_adapter_nest_wellplate_100ul_pcr_full_skirt/1.json': standard96WellNames,
  'opentrons_universal_flat_adapter_corning_384_wellplate_112ul_flat/1.json': standard384WellNames,

  // This batch may have incompletely-updated geometry from recent work related to
  // liquid level detection and meniscus-relative pipetting. Probably, the wells were
  // updated but not the overall labware dimensions. This needs to be investigated and fixed.
  'nest_96_wellplate_100ul_pcr_full_skirt/3.json': standard96WellNames,
  'opentrons_24_tuberack_nest_1.5ml_screwcap/2.json': standard24WellNames,
  'opentrons_24_tuberack_nest_2ml_screwcap/2.json': standard24WellNames,
  'usascientific_12_reservoir_22ml/2.json': generateStandardWellNames(1, 12),
  'corning_12_wellplate_6.9ml_flat/3.json': generateStandardWellNames(3, 4),
  'biorad_96_wellplate_200ul_pcr/3.json': standard96WellNames,
}

const filterWells = (
  labwareDef: LabwareDefinition2,
  predicate: (wellDef: LabwareWell) => boolean
): Set<string> => {
  return new Set(
    Object.entries(labwareDef.wells)
      .filter(([wellName, wellDef]) => predicate(wellDef))
      .map(([wellName, wellDef]) => wellName)
  )
}

const getWellsNotMatchingZDimension = (
  labwareDef: LabwareDefinition2
): Set<string> => {
  return filterWells(labwareDef, wellDef => {
    const absDifference = Math.abs(
      wellDef.depth + wellDef.z - labwareDef.dimensions.zDimension
    )
    return absDifference > 0.000001 // Tolerate floating point rounding errors.
  })
}

const getWellsHigherThanZDimension = (
  labwareDef: LabwareDefinition2
): Set<string> => {
  return filterWells(labwareDef, wellDef => {
    const difference =
      wellDef.depth + wellDef.z - labwareDef.dimensions.zDimension
    return difference > 0.000001 // Tolerate floating point rounding errors.
  })
}

const expectGroupsFollowConvention = (
  labwareDef: LabwareDefinition2,
  filename: string
): void => {
  test(`${filename} should not contain "groups.brand.brand" that matches the top-level "brand.brand"`, () => {
    const topLevelBrand = labwareDef.brand

    labwareDef.groups.forEach(group => {
      expect(group.brand?.brand).not.toEqual(topLevelBrand)
    })
  })

  test(`${filename} should not specify certain fields in 'groups' if it is a reservoir or wellPlate`, () => {
    // Certain fields in `groups` are intended to supplement labware-level information,
    // e.g. an Opentrons-brand tube rack might hold a group of Eppendorf-brand tubes.
    //
    // Those fields don't make sense on reservoirs or well plates, because the wells are
    // an inherent part of the labware. The information should just be specified in the
    // labware-level brand and metadata.

    if (
      labwareDef.parameters.loadName === 'nest_96_wellplate_2ml_deep' &&
      (labwareDef.version === 1 || labwareDef.version === 2)
    ) {
      // Bug in v1 and v2 of this labware, fixed in v3.
      return
    }

    const { displayCategory } = labwareDef.metadata
    const noGroupsMetadataAllowed =
      displayCategory === 'reservoir' || displayCategory === 'wellPlate'

    if (noGroupsMetadataAllowed) {
      labwareDef.groups.forEach(group => {
        expect(group.brand).toBe(undefined)
        expect(group.metadata.displayName).toBe(undefined)
        expect(group.metadata.displayCategory).toBe(undefined)
      })
    }
  })
}

const checkGeometryDefinitions = (labwareDef: LabwareDefinition2): void => {
  test('geometries referenced by wells must actually exist', () => {
    for (const geometryId of Object.values(labwareDef.wells).map(
      well => well.geometryDefinitionId
    )) {
      if (geometryId !== undefined) {
        expect(labwareDef.innerLabwareGeometry).toHaveProperty(geometryId)
      }
    }
  })

  test("geometries should only exist if they're referenced by at least one well", () => {
    function isDefined<T>(x: T | undefined): x is T {
      return x !== undefined
    }

    const referencedGeometryIds = new Set(
      Object.values(labwareDef.wells)
        .map(well => well.geometryDefinitionId)
        .filter(isDefined)
    )

    for (const geometryId in labwareDef.innerLabwareGeometry) {
      expect(referencedGeometryIds).toContain(geometryId)
    }
  })

  test('sections of a well geometry should be sorted top to bottom', () => {
    const geometries = Object.values(labwareDef.innerLabwareGeometry ?? [])
    for (const geometry of geometries) {
      const sectionList = geometry.sections
      const sortedSectionList = sectionList.toSorted(
        (a, b) => b.topHeight - a.topHeight
      )
      expect(sortedSectionList).toStrictEqual(sectionList)
    }
  })

  test('the bottom of a well geometry should be at height 0', () => {
    for (const geometry of Object.values(
      labwareDef.innerLabwareGeometry ?? {}
    )) {
      const bottomFrustum = geometry.sections[geometry.sections.length - 1]
      expect(bottomFrustum.bottomHeight).toStrictEqual(0)
    }
  })

  test('each section of a well geometry should have topHeight > bottomHeight', () => {
    for (const geometry of Object.values(
      labwareDef.innerLabwareGeometry ?? {}
    )) {
      for (const section of geometry.sections) {
        expect(section.topHeight).toBeGreaterThan(section.bottomHeight)
      }
    }
  })

  test('sections of a well geometry should exactly connect to each other', () => {
    for (const geometry of Object.values(
      labwareDef.innerLabwareGeometry ?? {}
    )) {
      for (const [above, below] of pairs(geometry.sections)) {
        expect(above.bottomHeight).toStrictEqual(below.topHeight)
      }
    }
  })

  test("a well's depth should equal the height of its geometry", () => {
    for (const well of Object.values(labwareDef.wells)) {
      const wellGeometryId = well.geometryDefinitionId

      if (wellGeometryId === undefined) return
      if (labwareDef.innerLabwareGeometry == null) return

      const wellGeometry = labwareDef.innerLabwareGeometry[wellGeometryId]
      if (wellGeometry === undefined) return

      const wellDepth = well.depth
      const topFrustumHeight = wellGeometry.sections[0].topHeight

      const labwareWithWellDepthMismatches = [
        // todo(mm, 2025-03-17): Investigate and resolve these mismatches.
        'agilent_1_reservoir_290ml/2',
        'corning_24_wellplate_3.4ml_flat/3',
        'corning_6_wellplate_16.8ml_flat/3',
        'corning_96_wellplate_360ul_flat/3',
        'nest_96_wellplate_2ml_deep/3',
        'opentrons_15_tuberack_falcon_15ml_conical/2',
        'opentrons_24_aluminumblock_nest_1.5ml_screwcap/2',
        'opentrons_24_aluminumblock_nest_2ml_screwcap/2',
        'opentrons_24_tuberack_eppendorf_2ml_safelock_snapcap/2',
        'opentrons_6_tuberack_falcon_50ml_conical/2',
        'opentrons_6_tuberack_nest_50ml_conical/2',
      ]

      if (
        labwareDef.parameters.loadName ===
          'opentrons_10_tuberack_falcon_4x50ml_6x15ml_conical' &&
        labwareDef.version === 2
      ) {
        // todo(mm, 2025-03-17): Some of the well heights in this definition do match
        // and some of them don't, so we can't assert either way. Investigate and
        // resolve the mismatches.
      } else if (
        labwareWithWellDepthMismatches.includes(
          labwareDef.parameters.loadName + '/' + labwareDef.version
        )
      ) {
        expect(wellDepth).not.toStrictEqual(topFrustumHeight)
      } else {
        expect(wellDepth).toStrictEqual(topFrustumHeight)
      }
    }
  })
}

test('fail on bad labware', () => {
  const badDef = {
    metadata: { name: 'bad' },
    ordering: ['A1'],
    // array of strings not array of arrays
    wells: {},
  }
  const valid = validate(badDef)
  const validationErrors = validate.errors

  expect(
    validationErrors?.find(err => err.dataPath === '/ordering/0')
  ).toMatchObject({
    message: 'should be array',
  })
  expect(valid).toBe(false)
})

describe('test schemas of all opentrons definitions', () => {
  const labwarePaths = glob.sync(globPattern, { cwd: definitionsDir })

  test("definition paths didn't break, which would give false positives", () => {
    expect(labwarePaths.length).toBeGreaterThan(0)
  })

  describe.each(labwarePaths)('%s', labwarePath => {
    const filename = path.parse(labwarePath).base
    const fullLabwarePath = path.join(definitionsDir, labwarePath)
    const labwareDef = require(fullLabwarePath) as LabwareDefinition2

    it('validates against the schema', () => {
      const valid = validate(labwareDef)
      const validationErrors = validate.errors
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })

    test('file name matches version', () => {
      expect(`${labwareDef.version}`).toEqual(path.basename(filename, '.json'))
    })

    test('parent dir matches loadName', () => {
      expect(labwareDef.parameters.loadName).toEqual(
        path.basename(path.dirname(labwarePath))
      )
    })

    test('namespace is "opentrons"', () => {
      expect(labwareDef.namespace).toEqual('opentrons')
    })

    expectGroupsFollowConvention(labwareDef, labwarePath)
  })
})

describe('test that the dimensions in all opentrons definitions make sense', () => {
  const labwarePaths = glob.sync('**/*.json', { cwd: definitionsDir })

  beforeAll(() => {
    // Make sure definitions path didn't break, which would give you false positives
    expect(labwarePaths.length).toBeGreaterThan(0)
  })

  describe.each(labwarePaths)('%s', labwarePath => {
    const fullLabwarePath = path.join(definitionsDir, labwarePath)
    const labwareDef = require(fullLabwarePath) as LabwareDefinition2

    const expectedWellsNotMatching =
      expectedWellsNotMatchingZDimension[labwarePath] ?? new Set()
    it(`has the expected ${expectedWellsNotMatching.size} wells not matching the labware's zDimension`, () => {
      const wellsNotMatching = getWellsNotMatchingZDimension(labwareDef)
      expect(wellsNotMatching).toEqual(expectedWellsNotMatching)
    })

    const expectedWellsHigher =
      expectedWellsHigherThanZDimension[labwarePath] ?? new Set()
    it(`has the expected ${expectedWellsHigher.size} wells above the labware's zDimension`, () => {
      const wellsHigher = getWellsHigherThanZDimension(labwareDef)
      expect(wellsHigher).toEqual(expectedWellsHigher)
    })

    checkGeometryDefinitions(labwareDef)
  })
})

describe('test schemas of all v2 labware fixtures', () => {
  const labwarePaths = glob.sync(globPattern, { cwd: fixturesDir })

  test("definition paths didn't break, which would give false positives", () => {
    expect(labwarePaths.length).toBeGreaterThan(0)
  })

  describe.each(labwarePaths)('%s', labwarePath => {
    const filename = path.parse(labwarePath).base
    const fullLabwarePath = path.join(fixturesDir, labwarePath)
    const labwareDef = require(fullLabwarePath) as LabwareDefinition2

    test(`${filename} validates against schema`, () => {
      const valid = validate(labwareDef)
      const validationErrors = validate.errors
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })

    test(`fixture file name matches loadName: ${labwarePath}`, () => {
      expect(labwareDef.parameters.loadName).toEqual(
        path.basename(filename, '.json')
      )
    })

    test(`namespace is "fixture": ${labwarePath}`, () => {
      expect(labwareDef.namespace).toEqual('fixture')
    })

    expectGroupsFollowConvention(labwareDef, filename)
  })
})

describe('check groups of labware that should have the same geometry', () => {
  describe.each(
    Object.entries(SHARED_GEOMETRY_GROUPS).map(([groupName, groupEntries]) => ({
      groupName,
      groupEntries,
    }))
  )('$groupName', ({ groupEntries }) => {
    const normalizedGroupEntries = groupEntries.map(entry => ({
      loadName: typeof entry === 'string' ? entry : entry.loadName,
      geometryKey: typeof entry === 'string' ? undefined : entry.geometryKey,
    }))
    test.each(normalizedGroupEntries)(
      '$loadName',
      ({ loadName, geometryKey }) => {
        // We arbitrarily pick the first labware in the group to compare the rest against.
        const otherLabwareGeometry = getGeometry(
          normalizedGroupEntries[0].loadName,
          normalizedGroupEntries[0].geometryKey
        )
        const thisLabwareGeometry = getGeometry(loadName, geometryKey)
        expect(thisLabwareGeometry).toEqual(otherLabwareGeometry)
      }
    )
  })
})

/** Return the latest version of the given labware that's defined in schema 2. */
function findLatestDefinition(loadName: string): LabwareDefinition2 {
  const candidates: LabwareDefinition2[] = glob
    .sync('*.json', {
      cwd: path.join(definitionsDir, loadName),
      absolute: true,
    })
    .map(require)
  if (candidates.length === 0) {
    throw new Error(`No definitions found for ${loadName}.`)
  }
  candidates.sort((a, b) => a.version - b.version)
  const latest = candidates[candidates.length - 1]
  return latest
}

/**
 * Extract the given geometry from the given definition.
 *
 * If geometryKey is unspecified, the definition is expected to have exactly one
 * geometry key, and that one is extracted and returned.
 */
function getGeometry(
  loadName: string,
  geometryKey: string | undefined
): InnerWellGeometry {
  const definition = findLatestDefinition(loadName)
  const availableGeometries = definition.innerLabwareGeometry ?? {}

  if (geometryKey === undefined) {
    const availableGeometryEntries = Object.entries(availableGeometries)
    if (availableGeometryEntries.length !== 1) {
      throw new Error(
        `Expected exactly 1 geometry in ${definition.parameters.loadName} but found ${availableGeometryEntries.length}.`
      )
    }
    return availableGeometryEntries[0][1]
  } else {
    const result = availableGeometries[geometryKey]
    if (result === undefined) {
      throw new Error(
        `No geometry found in ${definition.parameters.loadName} with key ${geometryKey}.`
      )
    }
    return result
  }
}

/**
 * [1, 2, 3, 4] -> [[1, 2], [2, 3], [3, 4]]
 *
 * [1] -> []
 */
function pairs<T>(array: T[]): Array<[T, T]> {
  return range(array.length - 1).map(firstIndex => [
    array[firstIndex],
    array[firstIndex + 1],
  ])
}
