import mapValues from 'lodash/mapValues'
import omit from 'lodash/omit'
import reduce from 'lodash/reduce'
import uniq from 'lodash/uniq'
import { v1LabwareModelToV2Def } from './utils/v1LabwareModelToV2Def'
import { getLabwareDefURI } from '@opentrons/shared-data'
import {
  ProtocolFile,
  FileLabware,
  FilePipette,
} from '@opentrons/shared-data/protocol/flowTypes/schemaV3'
import { PDProtocolFile as PDProtocolFileV1, PDMetadata } from './1_1_0'
// NOTE: PDMetadata type did not change btw 1.1.0 and 3.0.0
export type PDProtocolFile = ProtocolFile<PDMetadata>
// the version and schema for this migration
export const PD_VERSION = '3.0.0'
export const SCHEMA_VERSION = 3

function migrateMetadata(
  metadata: PDProtocolFileV1['metadata']
): PDProtocolFile['metadata'] {
  const metadataExtraKeys: typeof metadata = {
    ...metadata,
    protocolName: metadata['protocol-name'],
    lastModified: metadata['last-modified'],
  }
  return omit(metadataExtraKeys, ['protocol-name', 'last-modified'])
}

type FilePipettes = PDProtocolFile['pipettes']

function migratePipettes(pipettes: PDProtocolFileV1['pipettes']): FilePipettes {
  return Object.keys(pipettes).reduce<FilePipettes>(
    (acc, pipetteId: string) => {
      const oldPipette = pipettes[pipetteId]
      const nextPipette: FilePipette = {
        mount: oldPipette.mount,
        name: oldPipette.name || (oldPipette.model || '').split('_v')[0],
      }
      // NOTE: the hacky model to name ('p10_single_v1.3' -> 'p10_single') fallback
      // should already be handled in most cases, this is just for safety
      return { ...acc, [pipetteId]: nextPipette }
    },
    {}
  )
}

type FileLabwares = PDProtocolFile['labware']

function migrateLabware(labware: PDProtocolFileV1['labware']): FileLabwares {
  return Object.keys(labware).reduce<FileLabwares>((acc, labwareId: string) => {
    const oldLabware = labware[labwareId]
    const nextLabware: FileLabware = {
      slot: oldLabware.slot,
      displayName: oldLabware['display-name'],
      definitionId: getLabwareDefURI(v1LabwareModelToV2Def(oldLabware.model)),
    }
    return { ...acc, [labwareId]: nextLabware }
  }, {})
}

type LabwareDefinitions = PDProtocolFile['labwareDefinitions']

function getLabwareDefinitions(
  labware: PDProtocolFileV1['labware']
): LabwareDefinitions {
  const allLabwareModels = uniq(
    Object.keys(labware).map((labwareId: string) => labware[labwareId].model)
  )
  const allLabwareDefs = allLabwareModels.map(v1LabwareModelToV2Def)
  return reduce(
    allLabwareDefs,
    (acc, def): LabwareDefinitions => ({
      ...acc,
      [getLabwareDefURI(def)]: def,
    }),
    {}
  )
}

function migrateAppData(appData: PDMetadata): PDMetadata {
  // update pipette tiprack v1 model to v2 URI
  return {
    ...appData,
    pipetteTiprackAssignments: mapValues(
      appData.pipetteTiprackAssignments,
      (model: string): string => getLabwareDefURI(v1LabwareModelToV2Def(model))
    ),
  }
}

export const migrateFile = (fileData: PDProtocolFileV1): PDProtocolFile => {
  return {
    designerApplication: {
      name: 'opentrons/protocol-designer',
      version: PD_VERSION,
      data: migrateAppData(fileData['designer-application'].data),
    },
    schemaVersion: SCHEMA_VERSION,
    metadata: migrateMetadata(fileData.metadata),
    robot: fileData.robot,
    pipettes: migratePipettes(fileData.pipettes),
    labware: migrateLabware(fileData.labware),
    labwareDefinitions: getLabwareDefinitions(fileData.labware),
    commands: [], // NOTE: these will be generated by PD upon import
  }
}
