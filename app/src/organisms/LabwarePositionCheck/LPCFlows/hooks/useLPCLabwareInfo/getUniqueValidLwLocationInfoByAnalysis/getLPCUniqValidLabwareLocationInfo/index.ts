import { appendUniqValidLocCombo } from './appendUniqValidLocCombo'
import { getLoadLabwareLocationCombo } from './getLoadLabwareLocationCombo'
import { getMoveLabwareLocationCombo } from './getMoveLabwareLocationCombo'
import { scanAllCommandsForAllLwUrisByLwId } from './getAllPossibleLwURIsInRun'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  LabwareLocationSequence,
} from '@opentrons/shared-data'
import type { LabwareLocationInfo } from '/app/redux/protocol-runs'

export interface LabwareLocationInfoWithLocSeq extends LabwareLocationInfo {
  locationSequence: LabwareLocationSequence
}

// Iterate through all commands, returning unique, valid labware location info for LPC.
// See helper utilities for what constitutes "unique" and "valid".
export function getLPCUniqValidLabwareLocationInfo(
  protocolData: CompletedProtocolAnalysis | null,
  lwDefs: LabwareDefinition2[]
): LabwareLocationInfo[] {
  const { commands, labware, modules = [] } = protocolData ?? {
    labware: [],
    modules: [],
    commands: [],
  }

  const lwIdUriInfo = scanAllCommandsForAllLwUrisByLwId(labware, commands)
  return (
    commands
      .reduce<LabwareLocationInfoWithLocSeq[]>((acc, command) => {
        const getPotentialCombo = (): LabwareLocationInfoWithLocSeq | null => {
          switch (command.commandType) {
            case 'loadLabware':
              return getLoadLabwareLocationCombo(command, labware, modules)
            case 'moveLabware':
              return getMoveLabwareLocationCombo(
                command,
                lwIdUriInfo,
                labware,
                modules
              )
            default:
              return null
          }
        }

        return appendUniqValidLocCombo(acc, lwDefs, getPotentialCombo())
      }, [])
      // Don't return the locationSequence at this point, because LPC doesn't
      // actually care about it, and it's a huge footgun.
      .map(comboWithLoqSeq => {
        const { locationSequence, ...rest } = comboWithLoqSeq
        return rest
      })
  )
}
