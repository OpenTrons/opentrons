import labwareSchemaV2 from '../labware/schemas/2.json'

import fixture96Plate from '../labware/fixtures/2/fixture_96_plate.json'
import fixture12Trough from '../labware/fixtures/2/fixture_12_trough.json'
import fixture24Tuberack from '../labware/fixtures/2/fixture_24_tuberack.json'
import fixtureTiprack10ul from '../labware/fixtures/2/fixture_tiprack_10_ul.json'
import fixtureTiprack300ul from '../labware/fixtures/2/fixture_tiprack_300_ul.json'
import fixtureTiprack1000ul from '../labware/fixtures/2/fixture_flex_96_tiprack_1000ul.json'
import fixtureTiprackAdapter from '../labware/fixtures/2/fixture_flex_96_tiprack_adapter.json'
import fixtureCalibrationBlock from '../labware/fixtures/2/fixture_calibration_block.json'
import fixture384Plate from '../labware/fixtures/2/fixture_384_plate.json'
import fixtureTrash from '../labware/fixtures/2/fixture_trash.json'

import type {
  LabwareDefByDefURI,
  LabwareDefinition1,
  LabwareDefinition2,
  LabwareDefinition3,
  LegacyLabwareDefByName,
} from './types'

// todo(mm, 2025-03-04): This duplicates getLabwareDefUri() in ./helpers. We should use
// that instead, but using it gives me obscure "TypeError: getLabwareDefURI is not a function"
// errors in certain test files. Some kind of circular dependency problem? Some kind of
// mocking problem?
function getLabwareDefURI(
  def: LabwareDefinition2 | LabwareDefinition3
): string {
  return `${def.namespace}/${def.parameters.loadName}/${def.version}`
}

const schema1DefinitionsByPath: Record<
  string,
  LabwareDefinition1
> = import.meta.glob('../labware/definitions/1/*.json', {
  eager: true,
  import: 'default',
})
const schema2DefinitionsByPath: Record<
  string,
  LabwareDefinition2
> = import.meta.glob('../labware/definitions/2/*/*.json', {
  eager: true,
  import: 'default',
})
const schema3DefinitionsByPath: Record<
  string,
  LabwareDefinition3
> = import.meta.glob('../labware/definitions/3/*/*.json', {
  eager: true,
  import: 'default',
})

const schema1DefinitionsByName = Object.fromEntries(
  Object.values(schema1DefinitionsByPath).map(def => [def.metadata.name, def])
)
const schema2DefinitionsByURI = Object.fromEntries(
  Object.values(schema2DefinitionsByPath).map(def => [
    getLabwareDefURI(def),
    def,
  ])
)
// todo(mm, 2025-02-27): getAllDefinitions() should include this.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const schema3DefinitionsByURI = Object.fromEntries(
  Object.values(schema3DefinitionsByPath).map(def => [
    getLabwareDefURI(def),
    def,
  ])
)

// todo(mm, 2025-02-27): When calling code is ready, this should probably include
// schema 3 definitions, not just schema 2 definitions.
//
// todo(mm, 2025-02-27): The only remaining difference between this and
// getAllDefinitions() is that getAllDefinitions() has potentially dangerous caching
// behavior (see the todo comment there). Delete this in favor of getAllDefinitions()
// when that's resolved.
export const getAllLabwareDefs = (): Record<string, LabwareDefinition2> =>
  schema2DefinitionsByURI

let _definitions: LabwareDefByDefURI | null = null
export function getAllDefinitions(
  blockList: string[] = []
): LabwareDefByDefURI {
  // todo(mm, 2025-02-27): This looks suspicious: if we're called twice with two
  // different blockList values, we'll return the same results for both.
  if (_definitions == null) {
    _definitions = Object.values(
      getAllLabwareDefs()
    ).reduce<LabwareDefByDefURI>((acc, labwareDef: LabwareDefinition2) => {
      const labwareDefURI = getLabwareDefURI(labwareDef)
      return blockList.includes(labwareDef.parameters.loadName)
        ? acc
        : { ...acc, [labwareDefURI]: labwareDef }
    }, {})
  }

  return _definitions
}

export function getAllLegacyDefinitions(): LegacyLabwareDefByName {
  return schema1DefinitionsByName
}

export {
  labwareSchemaV2,
  fixture96Plate,
  fixture12Trough,
  fixture24Tuberack,
  fixtureTiprack10ul,
  fixtureTiprack300ul,
  fixtureTiprack1000ul,
  fixtureTiprackAdapter,
  fixtureTrash,
  fixture384Plate,
  fixtureCalibrationBlock,
}

// Legacy exports.
// todo(mm, 2025-02-27): See if calling code can access these in a way that doesn't
// require us to export labware as individual objects.
export const opentrons96PcrAdapterV1 =
  schema2DefinitionsByURI['opentrons/opentrons_96_pcr_adapter/1']
export const opentrons1Trash3200MlFixedV1 =
  schema2DefinitionsByURI['opentrons/opentrons_1_trash_3200ml_fixed/1']
export const opentrons96Tiprack10UlV1Uncasted =
  schema2DefinitionsByURI['opentrons/opentrons_96_tiprack_10ul/1']
