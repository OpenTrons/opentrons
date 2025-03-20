import type { RunTimeCommand } from '@opentrons/shared-data'

interface URIDetails {
  loadName: string
  namespace: string
  version: number
}

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
        const { version, namespace, loadName } = splitLabwareDefUri(
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
        const { version, namespace, loadName } = splitLabwareDefUri(
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

// TODO(jh, 03-14-25): This util should live in shared-data with getLabwareDefURI.

function splitLabwareDefUri(uri: string): URIDetails {
  const parts = uri.split('/')

  if (parts.length !== 3) {
    console.error(
      `Error: Invalid URI format. Expected 3 parts, got ${parts.length}`
    )
    return { loadName: '', namespace: '', version: -1 }
  } else {
    const [namespace, loadName, versionStr] = parts

    return {
      namespace,
      loadName,
      version: Number(versionStr),
    }
  }
}
