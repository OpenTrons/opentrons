import { map } from 'lodash'
import mapValues from 'lodash/mapValues'
import omit from 'lodash/omit'
import {
  OT2_STANDARD_DECKID,
  OT2_STANDARD_MODEL,
  ProtocolFileV5,
} from '@opentrons/shared-data'
import { uuid } from '../../utils'
// NOTE: this migration bump adds load commands (loadLiquid, loadModule, loadPipette, loadLabware), modifies both pipette
//  and labware access parameters, renames AirGap to aspirate, and removes all temporal properties from labware, pipettes,
//  and module keys such as slot, mount
//  and renames well to wellName
import type {
  LoadPipetteCreateCommand,
  LoadModuleCreateCommand,
  LoadLabwareCreateCommand,
} from '@opentrons/shared-data/protocol/types/schemaV6/command/setup'
import {
  CreateCommand,
  ProtocolFile,
} from '@opentrons/shared-data/protocol/types/schemaV6'

const PD_VERSION = '6.0.0'
const SCHEMA_VERSION = 6

const migratePipettes = (appData: Record<string, any>): Record<string, any> =>
  mapValues(appData, pipettes => omit(pipettes, 'mount'))

const migrateLabware = (appData: Record<string, any>): Record<string, any> =>
  mapValues(appData, labware => omit(labware, 'slot'))

const migrateModules = (appData: Record<string, any>): Record<string, any> =>
  mapValues(appData, modules => omit(modules, 'slot'))

const migrateCommands = (
  v5Commands: ProtocolFileV5<{}>['commands']
): ProtocolFile<{}, CreateCommand>['commands'] => {
  return v5Commands.map(v5Command => {
    // replace airGap with aspirate and rename "command" to "commandType"
    const commandType =
      v5Command.command === 'airGap' ? 'aspirate' : v5Command.command
    if ('well' in v5Command.params) {
      // @ts-expect-error: we are modifying a v5 command (no wellName exists on a v5 command)
      v5Command.params.wellName = v5Command.params.well
      // @ts-expect-error: we are modifying a v5 command (well is required, but we are replacing it with wellName)
      delete v5Command.params.well
    }
    if ('pipette' in v5Command.params) {
      // @ts-expect-error: we are modifying a v5 command (no pipetteId exists on a v5 command)
      v5Command.params.pipetteId = v5Command.params.pipette
      // @ts-expect-error: we are modifying a v5 command (pipette is required, but we are replacing it with pipetteId)
      delete v5Command.params.pipette
    }
    if ('labware' in v5Command.params) {
      // @ts-expect-error: we are modifying a v5 command (no labwareId exists on a v5 command)
      v5Command.params.labwareId = v5Command.params.labware
      // @ts-expect-error: we are modifying a v5 command (labware is required, but we are replacing it with labwareId)
      delete v5Command.params.labware
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const v6Command = {
      commandType,
      key: uuid(),
      params: v5Command.params,
    } as CreateCommand
    return v6Command
  })
}

export const migrateFile = (
  appData: ProtocolFileV5<{}>
): ProtocolFile<{}, CreateCommand> => {
  const pipettes = appData.pipettes
  const loadPipetteCommands: LoadPipetteCreateCommand[] = map(
    pipettes,
    (pipette, pipetteId) => {
      const loadPipetteCommand = {
        key: uuid(),
        commandType: 'loadPipette' as const,
        params: {
          pipetteId: pipetteId,
          mount: pipette.mount,
        },
      }
      return loadPipetteCommand
    }
  )

  const modules = appData.modules
  const loadModuleCommands: LoadModuleCreateCommand[] = map(
    modules,
    (module, moduleId) => {
      const loadModuleCommand = {
        key: uuid(),
        commandType: 'loadModule' as const,
        params: {
          moduleId: moduleId,
          location: { slotName: module.slot },
        },
      }
      return loadModuleCommand
    }
  )

  const labware = appData.labware
  const loadLabwareCommands: LoadLabwareCreateCommand[] = map(
    labware,
    (labware, labwareId) => {
      const loadLabwareCommand = {
        key: uuid(),
        commandType: 'loadLabware' as const,
        params: {
          labwareId: labwareId,
          location: { slotName: labware.slot },
        },
      }
      return loadLabwareCommand
    }
  )

  const commands = appData.commands
  const migratedV5Commands = migrateCommands(commands)

  return {
    designerApplication: {
      name: 'opentrons/protocol-designer',
      version: PD_VERSION,
      data:
        appData.designerApplication === undefined
          ? undefined
          : appData.designerApplication.data,
    },
    schemaVersion: SCHEMA_VERSION,
    $otSharedSchema: '#/protocol/schemas/6',
    metadata: appData.metadata,
    robot: {
      model: OT2_STANDARD_MODEL,
      deckId: OT2_STANDARD_DECKID,
    },
    pipettes: migratePipettes(appData.pipettes),
    labware: migrateLabware(appData.labware),
    labwareDefinitions: appData.labwareDefinitions,
    modules: migrateModules(appData.modules),
    liquids: {},
    commands: [
      ...loadPipetteCommands,
      ...loadModuleCommands,
      ...loadLabwareCommands,
      ...migratedV5Commands,
    ],
  }
}
