import isEqual from 'lodash/isEqual'

import { getLoadedLabwareDefinitionsByUri } from '@opentrons/shared-data'

import { getLabwareDefinitionUri } from '/app/transformations/protocols'
import { getLegacyLabwareOffsetLocation } from '/app/transformations/analysis'
import { getLwOffsetLocSeqFromLocSeq } from '/app/local-resources/offsets'

import type {
  RunTimeCommand,
  LoadedLabware,
  LoadedModule,
  LoadLabwareRunTimeCommand,
  LoadModuleRunTimeCommand,
} from '@opentrons/shared-data'
import type {
  LabwareOffsetCreateData,
  LegacyLabwareOffsetCreateData,
  LegacyLabwareOffsetLocation,
} from '@opentrons/api-client'
import type { LabwareOffsetSnippetProps } from '/app/molecules/LabwareOffsetSnippet'

// Returns all copy for all load commands.
export function buildLoadCommandCopy(
  commands: RunTimeCommand[],
  labware: LoadedLabware[],
  modules: LoadedModule[],
  labwareOffsets?: LabwareOffsetSnippetProps['labwareOffsets']
): string[] {
  let moduleVariableById: { [moduleId: string]: string } = {}
  const adapterVariableById: { [labwareId: string]: string } = {}
  let labwareCount = 0

  return commands.reduce<string[]>((acc, command) => {
    if (command.commandType === 'loadLabware') {
      return [
        ...acc,
        ...handleLoadLabwareCommand(
          command,
          commands,
          labware,
          modules,
          moduleVariableById,
          adapterVariableById,
          labwareCount++,
          labwareOffsets
        ),
      ]
    } else if (command.commandType === 'loadModule') {
      const moduleLines = buildLoadModuleCommandInfo(
        command,
        moduleVariableById
      )
      moduleVariableById = moduleLines.moduleVariableById
      return [...acc, ...moduleLines.commandLines]
    }

    return acc
  }, [])
}

// Returns the finalized copy for load labware commands, including the set_offset()
// if applicable.
function handleLoadLabwareCommand(
  command: LoadLabwareRunTimeCommand,
  allCommands: RunTimeCommand[],
  labware: LoadedLabware[],
  modules: LoadedModule[],
  moduleVariableById: { [moduleId: string]: string },
  adapterVariableById: { [labwareId: string]: string },
  labwareCount: number,
  labwareOffsets?: LabwareOffsetSnippetProps['labwareOffsets']
): string[] {
  labwareCount = labwareCount + 1
  const labwareId = command.result?.labwareId ?? ''

  const loadedLabware = labware.find(item => item.id === labwareId)

  if (loadedLabware == null) {
    return []
  } else {
    const labwareDefinitions = getLoadedLabwareDefinitionsByUri(allCommands)

    const { loadName } = labwareDefinitions[
      loadedLabware.definitionUri
    ].parameters
    const loadStatement = buildLoadCopy(
      command,
      labware,
      loadName,
      labwareCount,
      moduleVariableById,
      adapterVariableById
    )

    const labwareDefUri = getLabwareDefinitionUri(
      labwareId,
      labware,
      labwareDefinitions
    )

    const legacyOffsetLocation = getLegacyLabwareOffsetLocation(
      labwareId,
      allCommands,
      modules,
      labware
    )

    const labwareOffset = findRelevantLabwareOffset(
      command,
      labwareDefUri,
      legacyOffsetLocation,
      labwareOffsets,
      labware,
      modules
    )

    // Generate final command with offset if available
    if (labwareOffset == null) {
      return [loadStatement, '']
    } else {
      const { x, y, z } = labwareOffset.vector
      return [
        loadStatement,
        `labware_${labwareCount}.set_offset(x=${x.toFixed(2)}, y=${y.toFixed(
          2
        )}, z=${z.toFixed(2)})`,
        '',
      ]
    }
  }
}

// Returns copy derived from the load command, updating module/adapter stores
// for future copy derivation.
function buildLoadCopy(
  command: LoadLabwareRunTimeCommand,
  labware: LoadedLabware[],
  loadName: string,
  labwareCount: number,
  moduleVariableById: { [moduleId: string]: string },
  adapterVariableById: { [labwareId: string]: string }
): string {
  const location = command.params.location

  if (location === 'offDeck' || location === 'systemLocation') {
    return `labware_${labwareCount} = protocol.load_labware("${loadName}", location="offDeck")`
  } else if ('slotName' in location) {
    const { slotName } = location

    // Store adapter variable for potential future use.
    const labwareId =
      labware.find(
        lw =>
          isEqual(lw.location, location) &&
          isEqual(lw.loadName, command.params.loadName)
      )?.id ?? null

    if (labwareId != null) {
      adapterVariableById[labwareId] = `labware_${labwareCount}`
    }

    return `labware_${labwareCount} = protocol.load_labware("${loadName}", location="${slotName}")`
  } else if ('addressableAreaName' in location) {
    const { addressableAreaName } = location

    if (command.params.labwareId) {
      adapterVariableById[command.params.labwareId] = `labware_${labwareCount}`
    }

    return `labware_${labwareCount} = protocol.load_labware("${loadName}", location="${addressableAreaName}")`
  } else if ('moduleId' in location) {
    const moduleVariable = moduleVariableById[location.moduleId]
    return `labware_${labwareCount} = ${moduleVariable}.load_labware("${loadName}")`
  } else if ('labwareId' in location) {
    const adapterVariable = adapterVariableById[location.labwareId]

    if (adapterVariable != null) {
      return `labware_${labwareCount} = ${adapterVariable}.load_labware("${loadName}")`
    }
  }

  return ''
}

// Returns the correct labware offset value depending on the shape of the location.
function findRelevantLabwareOffset(
  command: LoadLabwareRunTimeCommand,
  labwareDefUri: string,
  legacyOffsetLocation: LegacyLabwareOffsetLocation | null,
  labwareOffsets: LabwareOffsetSnippetProps['labwareOffsets'],
  labware: LoadedLabware[],
  modules: LoadedModule[]
): LegacyLabwareOffsetCreateData | LabwareOffsetCreateData | null {
  if (labwareOffsets == null) {
    return null
  }

  // Handle legacy offset lookup.
  const legacyLocationOffset = labwareOffsets.find(offset =>
    'location' in offset
      ? offset.definitionUri === labwareDefUri &&
        isEqual(offset.location, legacyOffsetLocation)
      : false
  ) as LegacyLabwareOffsetCreateData | undefined

  // Handle non-legacy offset lookup.
  const offsetForCommand = getLwOffsetLocSeqFromLocSeq(
    command.result?.locationSequence ?? [],
    labware,
    modules
  )
  const locationSequenceOffset = labwareOffsets.find(offset =>
    'locationSequence' in offset
      ? isEqual(labwareDefUri, offset.definitionUri) &&
        isEqual(offsetForCommand, offset.locationSequence)
      : false
  ) as LabwareOffsetCreateData | undefined

  // Only one returns a value, but one should always return a value.
  return locationSequenceOffset ?? legacyLocationOffset ?? null
}

// Returns info necessary to render copy and compute subsequent load module commands.
function buildLoadModuleCommandInfo(
  command: LoadModuleRunTimeCommand,
  currentModuleVariableById: { [moduleId: string]: string }
): {
  moduleVariableById: { [moduleId: string]: string }
  commandLines: string[]
} {
  if (command.result == null)
    return { moduleVariableById: currentModuleVariableById, commandLines: [] }

  const moduleVariable = `module_${
    Object.keys(currentModuleVariableById).length + 1
  }`

  const moduleVariableById = {
    ...currentModuleVariableById,
    [command.result.moduleId]: moduleVariable,
  }

  const { model } = command.params
  const { slotName } = command.params.location

  return {
    moduleVariableById,
    commandLines: [
      `${moduleVariable} = protocol.load_module("${model}", location="${slotName}")`,
      '',
    ],
  }
}
