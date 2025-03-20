import { getLabwareDefURI } from '@opentrons/shared-data'
import type {
  RunTimeCommand,
  LoadLabwareRunTimeCommand,
  LoadLidRunTimeCommand,
  LoadLidStackRunTimeCommand,
  LabwareDefinition2,
} from '@opentrons/shared-data'

export interface RequiredLabwareDetails {
  namespace: string
  displayName: string
  quantity: number
  labwareDef: LabwareDefinition2
  lidDisplayName?: string
}
type ProtocolDetailMap = Map<string, RequiredLabwareDetails>

/**
 * Returns an array of RequiredLabwareDetails objects that are required by the given commands for use in protocol details ODD and desktop.
 *
 * @param {RunTimeCommand[]} commands The protocol commands for which required labware setup items are being retrieved.
 * @returns {RequiredLabwareDetails[]} An array of required labware objects that are required by the given protocol commands.
 */

export function getRequiredLabwareDetailsFromLoadCommands(
  commands: RunTimeCommand[]
): RequiredLabwareDetails[] {
  const loadLabwareCommands =
    commands.filter(
      (
        command
      ): command is
        | LoadLabwareRunTimeCommand
        | LoadLidRunTimeCommand
        | LoadLidStackRunTimeCommand =>
        ['loadLabware', 'loadLid', 'loadLidStack'].includes(
          command.commandType
        ) &&
        command.result?.definition != null &&
        command.result?.definition.parameters.format !== 'trash'
    ) ?? []
  const labwareSetupItems = loadLabwareCommands.reduce((acc, command) => {
    if (command.result?.definition == null) return acc
    else if (command.commandType === 'loadLid') return acc
    else if (command.commandType === 'loadLidStack') {
      const defUri = getLabwareDefURI(command.result.definition)
      const stackCount = command.result?.labwareIds.length
      if (!acc.has(defUri)) {
        acc.set(defUri, {
          namespace: command.params.namespace,
          displayName: command.result?.definition.metadata.displayName,
          labwareDef: command.result?.definition,
          quantity: 0,
        })
      }
      acc.get(defUri).quantity += stackCount
      return acc
    } else {
      const lidCommand = loadLabwareCommands.find(
        c =>
          c.commandType === 'loadLid' &&
          c.params.location !== 'offDeck' &&
          c.params.location !== 'systemLocation' &&
          'labwareId' in c.params.location &&
          c.params.location.labwareId === command.result?.labwareId
      )
      let defUri = getLabwareDefURI(command.result?.definition)
      if (lidCommand?.result?.definition != null) {
        defUri = `${defUri}_${getLabwareDefURI(lidCommand.result.definition)}`
      }

      if (!acc.has(defUri)) {
        acc.set(defUri, {
          namespace: command.params.namespace,
          displayName: command.result?.definition.metadata.displayName,
          labwareDef: command.result?.definition,
          quantity: 0,
          lidDisplayName:
            lidCommand?.result?.definition != null
              ? lidCommand.result.definition.metadata.displayName
              : undefined,
        })
      }
      acc.get(defUri).quantity++
      return acc
    }
  }, new Map()) as ProtocolDetailMap

  return Array.from(labwareSetupItems.values())
}
