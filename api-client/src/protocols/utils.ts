// set of functions that parse details out of a protocol record and it's internals
import reduce from 'lodash/reduce'

import type {
  LabwareDefinition2,
  ModuleModel,
  PipetteName,
} from '@opentrons/shared-data'
import type { RunTimeCommand } from '@opentrons/shared-data/protocol/types/schemaV6'
import type {
  LoadLabwareRunTimeCommand,
  LoadModuleRunTimeCommand,
  LoadPipetteRunTimeCommand,
} from '@opentrons/shared-data/protocol/types/schemaV6/command/setup'

interface PipetteNamesByMount {
  left: PipetteName | null
  right: PipetteName | null
}
export function parseInitialPipetteNamesByMount(
  commands: RunTimeCommand[]
): PipetteNamesByMount {
  const rightPipetteName = commands.find(
    (command): command is LoadPipetteRunTimeCommand =>
      command.commandType === 'loadPipette' && command.params.mount === 'right'
  )?.params.pipetteName as PipetteName | undefined
  const leftPipetteName = commands.find(
    (command): command is LoadPipetteRunTimeCommand =>
      command.commandType === 'loadPipette' && command.params.mount === 'left'
  )?.params.pipetteName as PipetteName | undefined
  return {
    left: leftPipetteName ?? null,
    right: rightPipetteName ?? null,
  }
}

export interface PipetteNamesById {
  [pipetteId: string]: { name: PipetteName }
}

export function parseInitialPipetteNamesById(
  commands: RunTimeCommand[]
): PipetteNamesById {
  const rightPipette = commands.find(
    (command): command is LoadPipetteRunTimeCommand =>
      command.commandType === 'loadPipette' && command.params.mount === 'right'
  )
  const leftPipette = commands.find(
    (command): command is LoadPipetteRunTimeCommand =>
      command.commandType === 'loadPipette' && command.params.mount === 'left'
  )

  const rightPipetteById =
    rightPipette != null
      ? {
          [rightPipette.result.pipetteId]: {
            name: rightPipette.params.pipetteName,
          },
        }
      : {}
  const leftPipetteById =
    leftPipette != null
      ? {
          [leftPipette.result.pipetteId]: {
            name: leftPipette.params.pipetteName,
          },
        }
      : {}
  return {
    ...rightPipetteById,
    ...leftPipetteById,
  }
}

export function parseAllRequiredModuleModels(
  commands: RunTimeCommand[]
): ModuleModel[] {
  return commands.reduce<ModuleModel[]>(
    (acc, command) =>
      command.commandType === 'loadModule'
        ? [...acc, command.params.model]
        : acc,
    []
  )
}

export interface ModuleModelsById {
  [moduleId: string]: { model: ModuleModel }
}

export function parseAllRequiredModuleModelsById(
  commands: RunTimeCommand[]
): ModuleModelsById {
  return commands.reduce<ModuleModelsById>(
    (acc, command) =>
      command.commandType === 'loadModule'
        ? {
            ...acc,
            [command.result?.moduleId]: { model: command.params.model },
          }
        : acc,
    {}
  )
}

interface LoadedLabwareBySlot {
  [slotName: string]: LoadLabwareRunTimeCommand
}
export function parseInitialLoadedLabwareBySlot(
  commands: RunTimeCommand[]
): LoadedLabwareBySlot {
  const loadLabwareCommandsReversed = commands
    .filter(
      (command): command is LoadLabwareRunTimeCommand =>
        command.commandType === 'loadLabware'
    )
    .reverse()
  return reduce<LoadLabwareRunTimeCommand, LoadedLabwareBySlot>(
    loadLabwareCommandsReversed,
    (acc, command) =>
      'slotName' in command.params.location
        ? { ...acc, [command.params.location.slotName]: command }
        : acc,
    {}
  )
}

interface LoadedLabwareByModuleId {
  [moduleId: string]: LoadLabwareRunTimeCommand
}
export function parseInitialLoadedLabwareByModuleId(
  commands: RunTimeCommand[]
): LoadedLabwareByModuleId {
  const loadLabwareCommandsReversed = commands
    .filter(
      (command): command is LoadLabwareRunTimeCommand =>
        command.commandType === 'loadLabware'
    )
    .reverse()
  return reduce<LoadLabwareRunTimeCommand, LoadedLabwareByModuleId>(
    loadLabwareCommandsReversed,
    (acc, command) =>
      'moduleId' in command.params.location
        ? { ...acc, [command.params.location.moduleId]: command }
        : acc,
    {}
  )
}

export interface LoadedLabwareById {
  [labwareId: string]: {
    definitionId: string
    displayName?: string
  }
}

export function parseInitialLoadedLabwareById(
  commands: RunTimeCommand[]
): LoadedLabwareById {
  const loadLabwareCommandsReversed = commands
    .filter(
      (command): command is LoadLabwareRunTimeCommand =>
        command.commandType === 'loadLabware'
    )
    .reverse()
  return reduce<LoadLabwareRunTimeCommand, LoadedLabwareById>(
    loadLabwareCommandsReversed,
    (acc, command) => {
      const quirks = command.result.definition.parameters.quirks ?? []
      if (quirks.includes('fixedTrash')) {
        return { ...acc }
      }
      const labwareId = command.result.labwareId ?? ''
      const {
        namespace,
        version,
        parameters: { loadName },
      } = command.result.definition
      const definitionId = `${namespace}/${loadName}/${version}_id`

      return {
        ...acc,
        [labwareId]: {
          definitionId,
          displayName: command.params.displayName,
        },
      }
    },
    {}
  )
}

export interface LoadedLabwareDefinitionsById {
  [definitionId: string]: LabwareDefinition2
}
export function parseInitialLoadedLabwareDefinitionsById(
  commands: RunTimeCommand[]
): LoadedLabwareDefinitionsById {
  const labware = parseInitialLoadedLabwareById(commands)
  const loadLabwareCommandsReversed = commands
    .filter(
      (command): command is LoadLabwareRunTimeCommand =>
        command.commandType === 'loadLabware'
    )
    .reverse()
  return reduce<LoadLabwareRunTimeCommand, LoadedLabwareDefinitionsById>(
    loadLabwareCommandsReversed,
    (acc, command) => {
      const quirks = command.result.definition.parameters.quirks ?? []
      if (quirks.includes('fixedTrash')) {
        return { ...acc }
      }
      const labwareDef: LabwareDefinition2 = command.result?.definition
      const labwareId = command.result?.labwareId ?? ''
      const definitionId = labware[labwareId]?.definitionId

      return {
        ...acc,
        [definitionId]: labwareDef,
      }
    },
    {}
  )
}

interface LoadedModulesBySlot {
  [slotName: string]: LoadModuleRunTimeCommand
}
export function parseInitialLoadedModulesBySlot(
  commands: RunTimeCommand[]
): LoadedModulesBySlot {
  const loadLabwareCommandsReversed = commands
    .filter(
      (command): command is LoadModuleRunTimeCommand =>
        command.commandType === 'loadModule'
    )
    .reverse()
  return reduce<LoadModuleRunTimeCommand, LoadedModulesBySlot>(
    loadLabwareCommandsReversed,
    (acc, command) =>
      'slotName' in command.params.location
        ? { ...acc, [command.params.location.slotName]: command }
        : acc,
    {}
  )
}
