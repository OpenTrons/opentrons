import { appendUniqValidLocCombo } from './appendUniqValidLocCombo'
import { getLoadLabwareLocationCombo } from './getLoadLabwareLocationCombo'
import { getMoveLabwareLocationCombo } from './getMoveLabwareLocationCombo'
import { scanAllCommandsForAllLwUrisByLwId } from './getAllPossibleLwURIsInRun'

import type {
  LabwareDefinition2,
  LabwareLocationSequence,
  LoadedLabware,
  LoadedModule,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { LabwareLocationInfo } from '/app/redux/protocol-runs'

export interface LabwareLocationInfoWithLocSeq extends LabwareLocationInfo {
  locationSequence: LabwareLocationSequence
}

// Iterate through all commands, returning unique, valid labware location info for LPC.
// See helper utilities for what constitutes "unique" and "valid".
export function getLPCUniqValidLabwareLocationInfo(
  commands: RunTimeCommand[],
  lw: LoadedLabware[],
  modules: LoadedModule[],
  lwDefs: LabwareDefinition2[]
): LabwareLocationInfoWithLocSeq[] {
  const lwIdUriInfo = scanAllCommandsForAllLwUrisByLwId(lw, commands)
  return commands.reduce<LabwareLocationInfoWithLocSeq[]>((acc, command) => {
    const getPotentialCombo = (): LabwareLocationInfoWithLocSeq | null => {
      switch (command.commandType) {
        case 'loadLabware':
          return getLoadLabwareLocationCombo(command, lw, modules)
        case 'moveLabware':
          return getMoveLabwareLocationCombo(command, lwIdUriInfo, lw, modules)
        default:
          return null
      }
    }

    return appendUniqValidLocCombo(acc, lwDefs, getPotentialCombo())
  }, [])
}
