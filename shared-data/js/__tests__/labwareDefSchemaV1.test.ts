import path from 'path'
import glob from 'glob'
import Ajv from 'ajv'
import { describe, expect, it, test } from 'vitest'

import { labwareSchemaV1 } from '../schema'
import type { LabwareDefinition1 } from '../types'

const DEFINITIONS_GLOB_PATTERN = '../../labware/definitions/1/*.json'
const GLOB_OPTIONS = { absolute: true, cwd: __dirname }

// JSON Schema defintion & setup
const ajv = new Ajv({ allErrors: true, jsonPointers: true })
const validate = ajv.compile(labwareSchemaV1)

describe('test the schema against a minimalist fixture', () => {
  it('...', () => {
    const minimalLabwareDef = {
      metadata: { name: 'test-labware', format: 'trough' },
      ordering: [['A1']],
      wells: {
        A1: {
          depth: 40,
          height: 40,
          length: 70,
          'total-liquid-volume': 22000,
          width: 7,
          x: 10.84,
          y: 7.75,
          z: 0,
        },
      },
    }
    const valid = validate(minimalLabwareDef)
    const validationErrors = validate.errors

    expect(validationErrors).toBe(null)
    expect(valid).toBe(true)
  })

  it('fail on bad labware', () => {
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
})

describe('test all definitions', () => {
  const labwarePaths = glob.sync(DEFINITIONS_GLOB_PATTERN, GLOB_OPTIONS)

  test("definition paths didn't break, which would give false positives", () => {
    expect(labwarePaths.length).toBeGreaterThan(0)
  })

  describe.each(labwarePaths)('%s', labwarePath => {
    const filename = path.parse(labwarePath).name
    const labwareDef = require(labwarePath) as LabwareDefinition1

    it('validates against the schema', () => {
      const valid = validate(labwareDef)
      const validationErrors = validate.errors
      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })

    it(`has a file name that matches metadata.name: ${filename}`, () => {
      expect(labwareDef.metadata.name).toEqual(filename)
    })
  })
})
