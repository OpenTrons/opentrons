import { getPipetteSpecsV2 } from '@opentrons/shared-data'

import type { ConfigureForVolumeRunTimeCommand } from '@opentrons/shared-data/command'
import type { HandlesCommands } from '../types'

export function getConfigureForVolumeCommandText({
  command,
  commandTextData,
  t,
}: HandlesCommands<ConfigureForVolumeRunTimeCommand>): string {
  const { volume, pipetteId } = command.params
  const pipetteName = commandTextData?.pipettes.find(
    pip => pip.id === pipetteId
  )?.pipetteName

  return t('configure_for_volume', {
    volume,
    pipette:
      pipetteName != null ? getPipetteSpecsV2(pipetteName)?.displayName : '',
  })
}
