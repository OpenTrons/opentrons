import { uuid } from '../../utils'
import type { ConfigureForVolumeParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

export const configureForVolume: CommandCreator<ConfigureForVolumeParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, volume } = args
  const pipette = invariantContext.pipetteEntities[pipetteId]
  // No-op if there is no pipette
  if (!pipette) {
    return {
      commands: [],
    }
  }

  const commands = [
    {
      commandType: 'configureForVolume' as const,
      key: uuid(),
      params: {
        pipetteId,
        volume,
      },
    },
  ]
  return {
    commands,
    python: `${pipette.pythonName}.configure_for_volume(${volume})`,
  }
}
