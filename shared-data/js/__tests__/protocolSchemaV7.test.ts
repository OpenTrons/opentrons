/** Ensure that protocol schema v7 definition itself functions as intended,
 *  and that all v7 protocol fixtures will validate */
import Ajv from 'ajv'
import path from 'path'
import glob from 'glob'
import omit from 'lodash/omit'

import protocolSchema from '../../protocol/schemas/7-draft.json'
import labwareV2Schema from '../../labware/schemas/2.json'
import commandV7Schema from '../../command/schemas/7.json'
import simpleV7Fixture from '../../protocol/fixtures/7/simpleV7.json'

const fixturesGlobPath = path.join(
  __dirname,
  '../../protocol/fixtures/7/**/*.json'
)

const protocolFixtures = glob.sync(fixturesGlobPath)
const ajv = new Ajv({ allErrors: true, jsonPointers: true })

// v7 protocol schema contains reference to v2 labware schema, and v7 command schema, so give AJV access to it
ajv.addSchema(labwareV2Schema)
ajv.addSchema(commandV7Schema)

const validateProtocol = ajv.compile(protocolSchema)

describe('validate v7 protocol fixtures under JSON schema', () => {
  protocolFixtures.forEach(protocolPath => {
    it(path.basename(protocolPath), () => {
      const protocol = require(protocolPath)

      const valid = validateProtocol(protocol)
      const validationErrors = validateProtocol.errors

      if (validationErrors) {
        console.log(JSON.stringify(validationErrors, null, 4))
      }

      expect(validationErrors).toBe(null)
      expect(valid).toBe(true)
    })
  })
})

describe('ensure bad protocol data fails validation', () => {
  it('$otSharedSchema is required to be "#/protocol/schemas/7-draft"', () => {
    expect(validateProtocol(omit(simpleV7Fixture, '$otSharedSchema'))).toBe(
      false
    )
    expect(
      validateProtocol({
        ...simpleV7Fixture,
        $otSharedSchema: '#/protocol/schemas/3',
      })
    ).toBe(false)
  })

  it('schemaVersion is required to be 7', () => {
    expect(validateProtocol(omit(simpleV7Fixture, 'schemaVersion'))).toBe(false)
    expect(validateProtocol({ ...simpleV7Fixture, schemaVersion: 3 })).toBe(
      false
    )
  })

  it('reject bad values in "pipettes" objects', () => {
    const badPipettes = {
      missingKeys: {},
      missingName: { mount: 'left' },
      hasAdditionalProperties: {
        mount: 'left',
        name: 'pipetteName',
        blah: 'blah',
      },
    }

    Object.entries(badPipettes).forEach(([pipetteId, pipette]) => {
      expect(
        validateProtocol({
          ...simpleV7Fixture,
          pipettes: {
            ...simpleV7Fixture.pipettes,
            [pipetteId]: pipette,
          },
        })
      ).toBe(false)
    })
  })

  it('reject bad values in "labware" objects', () => {
    const badLabware = {
      noDefId: { displayName: 'myLabware' },
      hasAdditionalProperties: {
        slot: '1',
        definitionId: 'defId',
        blah: 'blah',
      },
    }

    Object.entries(badLabware).forEach(([labwareId, labware]) => {
      expect(
        validateProtocol({
          ...simpleV7Fixture,
          labware: {
            ...simpleV7Fixture.labware,
            [labwareId]: labware,
          },
        })
      ).toBe(false)
    })
  })

  it('reject bad values in "modules" objects', () => {
    const badModules = {
      noModel: { moduleType: 'thermocycler' },
      hasAdditionalProperties: {
        model: 'thermocycler',
        slot: '1',
        blah: 'blah',
      },
    }

    Object.entries(badModules).forEach(([moduleId, module]) => {
      expect(
        validateProtocol({
          ...simpleV7Fixture,
          modules: {
            ...simpleV7Fixture.modules,
            [moduleId]: module,
          },
        })
      ).toBe(false)
    })
  })
})
