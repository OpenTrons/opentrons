import {
  getPipetteNameSpecs,
  PipetteName,
  RunTimeCommand,
} from '@opentrons/shared-data'

/**
 * @param pipetteName name of pipette being used
 * @param commands list of commands to search within
 * @param wellName the target well for pickup tip
 * @returns WellRange string of wells pipette will pickup tips from
 */
export function getWellRange(
  pipetteId: string,
  pipetteName: PipetteName,
  commands: RunTimeCommand[],
  wellName: string
): string {
  const pipetteChannels = getPipetteNameSpecs(pipetteName)?.channels ?? 1
  let usedChannels = pipetteChannels
  if (pipetteChannels === 96) {
    for (const c of commands.reverse()) {
      if (
        c.commandType === 'configureNozzleLayout' &&
        c.params?.pipetteId === pipetteId
      ) {
        // TODO(sb(11/9/23): add support for quadrant and row configurations as needed)
        if (c.params.configuration_params.style === 'SINGLE') {
          usedChannels = 1
        } else if (c.params.configuration_params.style === 'COLUMN') {
          usedChannels = 8
        }
        break
      }
    }
  }
  if (usedChannels === 96) {
    return 'A1 - H12'
  } else if (usedChannels === 8) {
    const column = wellName.substr(1)
    return `A${column} - H${column}`
  }
  return wellName
}
