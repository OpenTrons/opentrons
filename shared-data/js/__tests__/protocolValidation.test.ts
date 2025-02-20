/** Ensure that we can parse all our fixture json protocols, which also
 * ensures that our protocol schemas are correct */
import path from 'path'
import glob from 'glob'
import { validate } from '../protocols'
import { omit } from 'lodash'
import { describe, expect, it } from 'vitest'

const relRoot = path.join(__dirname, '../../protocol/fixtures/')

const protocolFixtures4 = glob.sync(
  path.join(__dirname, '../../protocol/fixtures/4/*.json')
)
const protocolFixtures5 = glob.sync(
  path.join(__dirname, '../../protocol/fixtures/5/*.json')
)
const protocolFixtures6 = glob.sync(
  path.join(__dirname, '../../protocol/fixtures/6/*.json')
)
const protocolFixtures7 = glob.sync(
  path.join(__dirname, '../../protocol/fixtures/7/*.json')
)
const protocolFixtures8 = glob.sync(
  path.join(__dirname, '../../protocol/fixtures/8/*.json')
)

describe('check that all fixtures can validate', () => {
  const protocolPaths = [
    ...protocolFixtures4,
    ...protocolFixtures5,
    ...protocolFixtures6,
    ...protocolFixtures7,
    ...protocolFixtures8,
  ]
  protocolPaths.forEach(protocolPath => {
    it(`${path.relative(relRoot, protocolPath)}`, () => {
      const protocol = require(protocolPath)
      return validate(protocol)
    })
  })
})

describe('test that mutating v8 fixtures causes failure', () => {
  const base = require('../../protocol/fixtures/8/simpleV8.json')
  it('should fail validation with no schema spec', () => {
    const mangled = omit(base, '$otSharedSchema')
    expect.assertions(1)
    return expect(validate(mangled)).rejects.toMatchObject([
      { keyword: 'Invalid protocol schema requested' },
    ])
  })
  it('should fail validation with a schema spec from the future', () => {
    const mangled = { ...base, $otSharedSchema: 'opentronsProtocolSchemaV9' }
    expect.assertions(1)
    return expect(validate(mangled)).rejects.toMatchObject([
      { keyword: 'Invalid protocol schema requested' },
    ])
  })
  it('should fail validation with a mangled schema spec', () => {
    const mangled = { ...base, $otSharedSchema: 'asdhasda' }
    expect.assertions(1)
    return expect(validate(mangled)).rejects.toMatchObject([
      { keyword: 'Invalid protocol schema requested' },
    ])
  })
  it('should fail validation with a mangled command schema spec', () => {
    const mangled = { ...base, commandSchemaId: 'asdasd' }
    return expect(validate(mangled)).rejects.toMatchObject([
      { keyword: 'Invalid command schema requested' },
    ])
  })
  it('should fail validation with a mangled liquid schema spec', () => {
    const mangled = { ...base, liquidSchemaId: 'asdhasdas' }
    return expect(validate(mangled)).rejects.toMatchObject([
      { keyword: 'Invalid liquid schema requested' },
    ])
  })
  it('should fail validation with a mangled command annotation schema spec', () => {
    const mangled = { ...base, commandAnnotationSchemaId: 'asdasd' }
    return expect(validate(mangled)).rejects.toMatchObject([
      { keyword: 'Invalid command annotation schema requested' },
    ])
  })
})
