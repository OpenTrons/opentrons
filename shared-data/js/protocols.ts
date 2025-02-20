// Helper functions for validating protocols. Used only in tests right now but
// intended for use as the thing that turns something from a json document into
// a protocol inside the js ecosystem.

import Ajv from 'ajv'

import commandSchema10 from '../command/schemas/10.json'
import commandSchema9 from '../command/schemas/9.json'
import commandSchema8 from '../command/schemas/8.json'
import commandSchema7 from '../command/schemas/7.json'
import commandAnnotationSchema1 from '../commandAnnotation/schemas/1.json'
import liquidSchema1 from '../liquid/schemas/1.json'
import labwareSchema2 from '../labware/schemas/2.json'
import labwareSchema3 from '../labware/schemas/3.json'

import protocolSchema8 from '../protocol/schemas/8.json'
import protocolSchema7 from '../protocol/schemas/7.json'
import protocolSchema6 from '../protocol/schemas/6.json'
import protocolSchema5 from '../protocol/schemas/5.json'
import protocolSchema4 from '../protocol/schemas/4.json'
import protocolSchema3 from '../protocol/schemas/3.json'
import protocolSchema1 from '../protocol/schemas/1.json'
import type * as ProtocolSchemas from '../protocol'
import type { CreateCommand } from '../command/types'
import type { CommandAnnotation } from '../commandAnnotation/types'

export type { ProtocolSchemas }

const validateCommands8 = (
  toValidate: ProtocolSchemas.ProtocolStructureV8
): Promise<CreateCommand[]> =>
  new Promise((resolve, reject) => {
    const requestedSchema = toValidate.commandSchemaId
    switch (requestedSchema) {
      case 'opentronsCommandSchemaV10':
        resolve(commandSchema10)
        break
      case 'opentronsCommandSchemaV9':
        resolve(commandSchema9)
        break
      case 'opentronsCommandSchemaV8':
        resolve(commandSchema8)
        break
      default:
        // eslint-disable-next-line prefer-promise-reject-errors
        reject([
          {
            keyword: 'Invalid command schema requested',
            dataPath: requestedSchema,
            schemaPath: '#/properties/commandSchemaId',
            params: {
              allowedValues: [
                'opentronsCommandSchemaV8',
                'opentronsCommandSchemaV9',
                'opentronsCommandSchemaV10',
              ],
            },
          },
        ])
        break
    }
  }).then(
    schema =>
      new Promise((resolve, reject) => {
        const generatedSchema = { type: 'array', items: schema }
        const commandAjv = new Ajv({ allErrors: true, jsonPointers: true })
        const validateCommands = commandAjv.compile(generatedSchema)
        const ok = validateCommands(toValidate.commands)
        if (ok == null || ok === false) {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject(validateCommands.errors)
        }
        resolve(toValidate.commands)
      })
  )

const validateCommandAnnotations8 = (
  toValidate: ProtocolSchemas.ProtocolStructureV8
): Promise<CommandAnnotation[]> =>
  new Promise<object>((resolve, reject) => {
    const requestedSchema = toValidate.commandAnnotationSchemaId
    switch (requestedSchema) {
      case 'opentronsCommandAnnotationSchemaV1':
        resolve(commandAnnotationSchema1)
        break
      default:
        // eslint-disable-next-line prefer-promise-reject-errors
        reject([
          {
            keyword: 'Invalid command annotation schema requested',
            dataPath: requestedSchema,
            schemaPath: '#/properties/commandAnnotationSchemaId',
            params: { allowedValues: ['opentronsCommandAnnotationSchemaV1'] },
          },
        ])
    }
  }).then(
    schema =>
      new Promise((resolve, reject) => {
        const generatedSchema = {
          type: 'array',
          items: { $ref: 'opentronsCommandAnnotationSchemaV1' },
        }
        const annotationAjv = new Ajv({ allErrors: true, jsonPointers: true })
        annotationAjv.addSchema(schema)
        const validateAnnotations = annotationAjv.compile(generatedSchema)
        const ok = validateAnnotations(toValidate.commandAnnotations)
        if (ok == null || ok === false) {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject(validateAnnotations.errors)
        }
        resolve(toValidate.commandAnnotations)
      })
  )

const validateLiquids8 = (
  toValidate: ProtocolSchemas.ProtocolStructureV8
): Promise<ProtocolSchemas.ProtocolFileV8['liquids']> =>
  new Promise((resolve, reject) => {
    const requestedSchema = toValidate.liquidSchemaId
    switch (requestedSchema) {
      case 'opentronsLiquidSchemaV1':
        resolve(liquidSchema1)
        break
      default:
        // eslint-disable-next-line prefer-promise-reject-errors
        reject([
          {
            keyword: 'Invalid liquid schema requested',
            dataPath: requestedSchema,
            schemaPath: '#/properties/liquidSchemaId',
            params: { allowedValues: ['opentronsLiquidSchemaV1'] },
          },
        ])
    }
  }).then(
    schema =>
      new Promise((resolve, reject) => {
        const generatedSchema = {
          type: 'object',
          patternProperties: { '.+': schema },
        }
        const liquidAjv = new Ajv({ allErrors: true, jsonPointers: true })
        const validateLiquids = liquidAjv.compile(generatedSchema)
        const ok = validateLiquids(toValidate.liquids)
        if (ok == null || ok === false) {
          // eslint-disable-next-line prefer-promise-reject-errors
          reject(validateLiquids.errors)
        }
        resolve(toValidate.liquids)
      })
  )

const validateLabware8 = (
  toValidate: ProtocolSchemas.ProtocolStructureV8
): Promise<ProtocolSchemas.ProtocolFileV8['labwareDefinitions']> =>
  new Promise((resolve, reject) => {
    const generatedSchema = {
      type: 'object',
      patternProperties: {
        '.+': { anyOf: [labwareSchema2, labwareSchema3] },
      },
    }
    const labwareAjv = new Ajv({ allErrors: true, jsonPointers: true })
    const validateLabware = labwareAjv.compile(generatedSchema)
    const ok = validateLabware(toValidate.labwareDefinitions)
    if (ok == null || ok === false) {
      // eslint-disable-next-line prefer-promise-reject-errors
      reject(validateLabware.errors)
    }
    resolve(toValidate.labwareDefinitions)
  })

const validate8 = (toValidate: any): Promise<ProtocolSchemas.ProtocolFileV8> =>
  new Promise<ProtocolSchemas.ProtocolStructureV8>((resolve, reject) => {
    const protoAjv = new Ajv({ allErrors: true, jsonPointers: true })
    const validateProtocol = protoAjv.compile(protocolSchema8)
    const valid = validateProtocol(toValidate)
    if (valid == null || valid === false) {
      // eslint-disable-next-line prefer-promise-reject-errors
      reject(validateProtocol.errors)
    }
    const validatedProtocol = toValidate as ProtocolSchemas.ProtocolStructureV8
    resolve(validatedProtocol)
  })
    .then(protocol =>
      Promise.all([
        validateCommands8(protocol),
        validateCommandAnnotations8(protocol),
        validateLiquids8(protocol),
        validateLabware8(protocol),
      ])
    )
    .then(() => Promise.resolve(toValidate as ProtocolSchemas.ProtocolFileV8))

const fakeAjvErrorForBadOTSharedSchema = (
  requestedValue: any
): Ajv.ErrorObject => ({
  keyword: 'Invalid protocol schema requested',
  dataPath: requestedValue,
  schemaPath: '#/properties/$otSharedSchema',
  params: {
    allowedValues: [
      '#/protocol/schemas/8',
      '#/protocol/schemas/7',
      '#/protocol/schemas/6',
      '#/protocol/schemas/5',
      '#/protocol/schemas/4',
      '#/protocol/schemas/3',
      '#/protocol/schemas/2',
      '#/protocol/schemas/1',
    ],
  },
})

type ProtocolFileSub7 =
  | ProtocolSchemas.ProtocolFileV6
  | ProtocolSchemas.ProtocolFileV5<Record<string, unknown>>
  | ProtocolSchemas.ProtocolFileV4<Record<string, unknown>>
  | ProtocolSchemas.ProtocolFileV3<Record<string, unknown>>
  | ProtocolSchemas.ProtocolFileV1<Record<string, unknown>>

const validateSub7 = (
  toValidate: object,
  schemaObj: object
): Promise<ProtocolFileSub7> =>
  new Promise((resolve, reject) => {
    const ajv = new Ajv({ allErrors: true, jsonPointers: true })
    ajv.addSchema(labwareSchema2)
    const validateProtocol = ajv.compile(schemaObj)
    const ok = validateProtocol(toValidate)
    if (ok == null || ok === false) {
      // eslint-disable-next-line prefer-promise-reject-errors
      reject(validateProtocol.errors)
    }
    resolve(toValidate as ProtocolFileSub7)
  })

const validate7 = (toValidate: any): Promise<ProtocolSchemas.ProtocolFileV7> =>
  new Promise((resolve, reject) => {
    const ajv = new Ajv({ allErrors: true, jsonPointers: true })
    ajv.addSchema([commandSchema7, labwareSchema2])
    const validateProtocol = ajv.compile(protocolSchema7)
    const ok = validateProtocol(toValidate)
    if (ok == null || ok === false) {
      // eslint-disable-next-line prefer-promise-reject-errors
      reject(validateProtocol.errors)
    }
    resolve(toValidate as ProtocolSchemas.ProtocolFileV7)
  })

// note: rejects with an array of ajv errors
export function validate(
  toValidate: Record<string, unknown>
): Promise<ProtocolSchemas.JsonProtocolFile> {
  // eslint-disable-next-line @typescript-eslint/dot-notation
  const requestedProtocolSchema = toValidate['$otSharedSchema']
  switch (requestedProtocolSchema) {
    case '#/protocol/schemas/8':
      return validate8(toValidate)
    case '#/protocol/schemas/7':
      return validate7(toValidate)
    case '#/protocol/schemas/6':
      return validateSub7(toValidate, protocolSchema6)
    case '#/protocol/schemas/5':
      return validateSub7(toValidate, protocolSchema5)
    case '#/protocol/schemas/4':
      return validateSub7(toValidate, protocolSchema4)
    default:
      if (!Object.keys(toValidate).includes('$otSharedSchema')) {
        const v3SchemaVersion = toValidate.schemaVersion
        if (v3SchemaVersion === '3.0.0') {
          return validateSub7(toValidate, protocolSchema3)
        }
        const v1SchemaVersion = toValidate['protocol-schema']
        if (v1SchemaVersion === '1.0.0') {
          return validateSub7(toValidate, protocolSchema1)
        }
      }

      return new Promise((resolve, reject) => {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject([fakeAjvErrorForBadOTSharedSchema(requestedProtocolSchema)])
      })
  }
}

export * from '../protocol/fixtures/index'
