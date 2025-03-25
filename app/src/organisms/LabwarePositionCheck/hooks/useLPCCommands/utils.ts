import { splitLabwareDefURI } from '@opentrons/shared-data'

import type { RunTimeCommand } from '@opentrons/shared-data'

export interface StackerLwDetails {
  labwareId: string
  loadName: string
  namespace: string
  version: number
}

// Processes an array of commands and maps flexStacker retrieved labware IDs to their details.
export function mapFlexStackerLabware(
  commands: RunTimeCommand[]
): StackerLwDetails[] {
  return commands.reduce<StackerLwDetails[]>((acc, command) => {
    if (command.commandType === 'flexStacker/retrieve' && command.result) {
      // Primary labware case.
      if (command.result.labwareId) {
        const { version, namespace, loadName } = splitLabwareDefURI(
          command.result.primaryLabwareURI
        )

        acc.push({
          labwareId: command.result.labwareId,
          loadName,
          namespace,
          version,
        })
      }

      // Adapter labware case (if present).
      if (command.result.adapterId) {
        const { version, namespace, loadName } = splitLabwareDefURI(
          command.result.adapterLabwareURI
        )

        acc.push({
          labwareId: command.result.adapterId,
          loadName,
          namespace,
          version,
        })
      }
    }
    return acc
  }, [])
}
