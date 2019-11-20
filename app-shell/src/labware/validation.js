// @flow
import Ajv from 'ajv'
import sortBy from 'lodash/sortBy'
import labwareSchema from '@opentrons/shared-data/labware/schemas/2.json'

import {
  BAD_JSON_LABWARE_FILE,
  INVALID_LABWARE_FILE,
  DUPLICATE_LABWARE_FILE,
  OPENTRONS_LABWARE_FILE,
  VALID_LABWARE_FILE,
} from '@opentrons/app/src/custom-labware/selectors'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  UncheckedLabwareFile,
  CheckedLabwareFile,
  LabwareIdentity,
  ValidLabwareFile,
  OpentronsLabwareFile,
} from '@opentrons/app/src/custom-labware/types'

const ajv = new Ajv()
const validateDefinition = ajv.compile(labwareSchema)

const sameIdentity = (a: LabwareIdentity, b: LabwareIdentity) =>
  a.name === b.name && a.version === b.version && a.namespace === b.namespace

// TODO(mc, 2019-10-21): this code is somewhat duplicated with stuff in
// shared-data, but the shared-data validation function isn't geared towards
// this use case because it either throws or passes invalid files; align them
const validateLabwareDefinition = (data: any): LabwareDefinition2 | null =>
  validateDefinition(data) ? data : null

// validate a colection of unchecked labware files
export function validateLabwareFiles(
  files: Array<UncheckedLabwareFile>
): Array<CheckedLabwareFile> {
  const validated = files.map<CheckedLabwareFile>(file => {
    const { filename, data, created } = file

    // check that JSON parsed properly
    if (data === null) {
      return { filename, created, type: BAD_JSON_LABWARE_FILE }
    }

    // check file against the schema
    const validatedData = validateLabwareDefinition(data)

    if (validatedData === null) {
      return { filename, created, type: INVALID_LABWARE_FILE }
    }

    const identity = {
      name: validatedData.parameters.loadName,
      version: validatedData.version,
      namespace: validatedData.namespace,
    }

    const props = {
      filename,
      identity,
      created,
      metadata: validatedData.metadata,
    }

    return validatedData.namespace !== 'opentrons'
      ? ({ ...props, type: VALID_LABWARE_FILE }: ValidLabwareFile)
      : ({ ...props, type: OPENTRONS_LABWARE_FILE }: OpentronsLabwareFile)
  })

  return validated.map(v => {
    if (v.type === VALID_LABWARE_FILE) {
      const { type, ...props } = v

      // check for duplicates
      const duplicates = validated.filter(
        other => other.identity && sameIdentity(v.identity, other.identity)
      )

      // if there are duplicates and this labware isn't the oldest one
      // mark it as a duplicate
      if (duplicates.length > 1 && sortBy(duplicates, 'created')[0] !== v) {
        return { type: DUPLICATE_LABWARE_FILE, ...props }
      }
    }

    return v
  })
}

// validate a new unchecked file against a collection of already checked files
export function validateNewLabwareFile(
  existing: Array<CheckedLabwareFile>,
  newFile: UncheckedLabwareFile
): CheckedLabwareFile {
  const [checkedNewFile] = validateLabwareFiles([newFile])

  if (
    checkedNewFile.type === VALID_LABWARE_FILE &&
    existing.some(
      e => e.identity && sameIdentity(checkedNewFile.identity, e.identity)
    )
  ) {
    const { type, ...props } = checkedNewFile
    return { type: DUPLICATE_LABWARE_FILE, ...props }
  }

  return checkedNewFile
}
