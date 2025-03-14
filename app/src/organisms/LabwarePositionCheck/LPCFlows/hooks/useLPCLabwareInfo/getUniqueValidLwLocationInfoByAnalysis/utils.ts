import type { RunTimeCommand } from '@opentrons/shared-data'

export function isLocationSequenceAnalysisType(
  commands: RunTimeCommand[]
): boolean {
  const hasLocationSequence = commands.some(cmd => {
    switch (cmd.commandType) {
      case 'loadLabware':
      case 'moveLabware': {
        if (cmd.result != null && 'locationSequence' in cmd.result) {
          return true
        }
        break
      }
      // If we see these commands, we can assume we are dealing with location sequence protocols.
      case 'flexStacker/setStoredLabware':
      case 'flexStacker/retrieve': {
        return true
      }
    }
    return false
  })

  return hasLocationSequence
}
