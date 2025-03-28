import type {
  CreateCommand,
  LabwareDefinition2,
  LoadLabwareCreateCommand,
  LoadModuleCreateCommand,
  LoadPipetteCreateCommand,
  PipetteName,
} from '@opentrons/shared-data'
import type { Labware, Modules, Pipettes } from '../../../file-types'

export interface EquipmentLoadInfoFromCommands {
  pipettes: Pipettes
  modules: Modules
  labware: Labware
}
export const getEquipmentLoadInfoFromCommands = (
  commands: CreateCommand[],
  labwareDefinitions: {
    [definitionId: string]: LabwareDefinition2
  }
): EquipmentLoadInfoFromCommands => {
  const loadPipetteCommands = commands.filter(
    (command): command is LoadPipetteCreateCommand =>
      command.commandType === 'loadPipette'
  )
  const loadLabwareCommands = commands.filter(
    (command): command is LoadLabwareCreateCommand =>
      command.commandType === 'loadLabware'
  )
  const loadModuleCommands = commands.filter(
    (command): command is LoadModuleCreateCommand =>
      command.commandType === 'loadModule'
  )

  const pipettes = loadPipetteCommands.reduce<Pipettes>(
    (acc, loadPipette: LoadPipetteCreateCommand) => ({
      ...acc,
      [loadPipette.params.pipetteId]: {
        pipetteName: loadPipette.params.pipetteName as PipetteName,
      },
    }),
    {}
  )

  const labware = loadLabwareCommands.reduce<Labware>(
    (acc, loadLabware: LoadLabwareCreateCommand) => {
      const { params } = loadLabware
      const {
        displayName: nickName,
        loadName,
        version,
        namespace,
        labwareId,
      } = params
      const labwareDefURI = `${namespace}/${loadName}/${version}`

      if (labwareId == null) {
        console.error(
          `expected to find a labwareId from loadLabware command but could not with labwareDefURI ${labwareDefURI}`
        )
      }
      if (labwareDefinitions[labwareDefURI] == null) {
        console.error(
          `expected to find matching labware definition with loadname ${loadName} but could not`
        )
      }
      const id = labwareId ?? 'unknown id'
      const displayName = labwareDefinitions[labwareDefURI].metadata.displayName

      return {
        ...acc,
        [id]: {
          displayName: nickName ?? displayName,
          labwareDefURI,
        },
      }
    },
    {}
  )

  const modules = loadModuleCommands.reduce<Modules>(
    (acc, loadModule: LoadModuleCreateCommand) => {
      const { params } = loadModule
      const { moduleId, model } = params
      if (moduleId == null) {
        console.error(
          `expected to find moduleId from loadModule command wth model ${model} but could not`
        )
      }
      const id = moduleId ?? 'unknown id'
      return {
        ...acc,
        [id]: {
          model,
        },
      }
    },
    {}
  )
  return { pipettes, modules, labware }
}
