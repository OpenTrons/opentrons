import path from 'path'
import glob from 'glob'
import { describe, expect, it, test } from 'vitest'

import Ajv from 'ajv'

import type { InnerWellGeometry, LabwareDefinition3 } from '../types'
import schema from '../../labware/schemas/3.json'
import { SHARED_GEOMETRY_GROUPS } from './sharedGeometryGroups'

const fixturesDir = path.join(__dirname, '../../labware/fixtures/3')
const definitionsDir = path.join(__dirname, '../../labware/definitions/3')
const globPattern = '**/*.json'

const ajv = new Ajv({ allErrors: true, jsonPointers: true })
const validate = ajv.compile(schema)

const checkGeometryDefinitions = (labwareDef: LabwareDefinition3): void => {
  test('innerLabwareGeometry sections should be sorted top to bottom', () => {
    const geometries = Object.values(labwareDef.innerLabwareGeometry ?? [])
    for (const geometry of geometries) {
      const sectionList = geometry.sections
      const sortedSectionList = sectionList.toSorted(
        (a, b) => b.topHeight - a.topHeight
      )
      expect(sortedSectionList).toStrictEqual(sectionList)
    }
  })

  test('all geometryDefinitionIds should have an accompanying valid entry in innerLabwareGeometry', () => {
    for (const wellName in labwareDef.wells) {
      const wellGeometryId = labwareDef.wells[wellName].geometryDefinitionId

      if (wellGeometryId === undefined) {
        return
      }
      if (
        labwareDef.innerLabwareGeometry === null ||
        labwareDef.innerLabwareGeometry === undefined
      ) {
        return
      }

      expect(wellGeometryId in labwareDef.innerLabwareGeometry).toBe(true)

      // FIXME(mm, 2025-02-04):
      // `wellDepth` != `topFrustumHeight` for ~23/60 definitions.
      //
      // const wellDepth = labwareDef.wells[wellName].depth
      // const topFrustumHeight =
      //   labwareDef.innerLabwareGeometry[wellGeometryId].sections[0].topHeight
      // expect(wellDepth).toEqual(topFrustumHeight)
    }
  })
}

describe(`test labware definitions with schema v3`, () => {
  const definitionPaths = glob.sync(globPattern, {
    cwd: definitionsDir,
    absolute: true,
  })
  const fixturePaths = glob.sync(globPattern, {
    cwd: fixturesDir,
    absolute: true,
  })
  const allPaths = definitionPaths.concat(fixturePaths)

  test("paths didn't break, which would give false positives", () => {
    expect(definitionPaths.length).toBeGreaterThan(0)
    expect(fixturePaths.length).toBeGreaterThan(0)
  })

  describe.each(allPaths)('%s', labwarePath => {
    const labwareDef = require(labwarePath) as LabwareDefinition3

    it('validates against schema', () => {
      const valid = validate(labwareDef)
      const validationErrors = validate.errors

      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })

    checkGeometryDefinitions(labwareDef)
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

/**
 * Return the latest version of the given labware that's defined in schema 3.
 *
 * todo(mm, 2025-02-27): We already have a "production" getLatestLabwareDef() function
 * elsewhere, and it would be nice to reuse that, but it looks like that one currently
 * relies on a hard-coded list of labware.
 */
function findLatestDefinition(loadName: string): LabwareDefinition3 {
  const candidates: LabwareDefinition3[] = glob
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
