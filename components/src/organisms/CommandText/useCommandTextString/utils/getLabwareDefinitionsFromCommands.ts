import { getLabwareDefURI } from '@opentrons/shared-data'

import type {
  LabwareDefinition2,
  RunTimeCommand,
  LoadLabwareRunTimeCommand,
  LoadLidRunTimeCommand,
} from '@opentrons/shared-data'

// Note: This is an O(n) operation.
export function getLabwareDefinitionsFromCommands(
  commands: RunTimeCommand[]
): LabwareDefinition2[] {
  return commands.reduce<LabwareDefinition2[]>(
    (acc, command) => [
      ...getLabwareDefinitionFromCommand(command, acc),
      ...acc,
    ],
    []
  )
}

function getNewLabwareDefinitions(
  newDefinitions: Array<LabwareDefinition2 | null | undefined>,
  knownDefinitions: LabwareDefinition2[]
): LabwareDefinition2[] {
  return newDefinitions.filter(
    (maybeNewDef): maybeNewDef is LabwareDefinition2 =>
      maybeNewDef != null &&
      !knownDefinitions.some(
        knownDef => getLabwareDefURI(knownDef) === getLabwareDefURI(maybeNewDef)
      )
  )
}

const isLoadCommand = (
  command: RunTimeCommand
): command is LoadLabwareRunTimeCommand | LoadLidRunTimeCommand =>
  ['loadLabware', 'loadLid', 'loadLidStack'].includes(command.commandType)

function getLabwareDefinitionFromCommand(
  command: RunTimeCommand,
  known: LabwareDefinition2[]
): LabwareDefinition2[] {
  if (isLoadCommand(command)) {
    return getNewLabwareDefinitions([command.result?.definition], known)
  }
  if (command.commandType === 'flexStacker/setStoredLabware') {
    return getNewLabwareDefinitions(
      [
        command.result?.primaryLabwareDefinition,
        command.result?.adapterLabwareDefinition,
        command.result?.lidLabwareDefinition,
      ],
      known
    )
  }
  return []
}
