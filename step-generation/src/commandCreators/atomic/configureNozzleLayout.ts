import { COLUMN, SINGLE } from '@opentrons/shared-data'
import { uuid } from '../../utils'
import type { CommandCreator } from '../../types'
import type { NozzleConfigurationStyle } from '@opentrons/shared-data'

interface configureNozzleLayoutArgs {
  pipetteId: string
  nozzles: NozzleConfigurationStyle
}

export const configureNozzleLayout: CommandCreator<configureNozzleLayoutArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, nozzles } = args
  const { pipetteEntities } = invariantContext
  const channels = pipetteEntities[pipetteId]?.spec.channels

  let primaryNozzle
  if (nozzles === COLUMN) {
    primaryNozzle = 'A12'
  } else if (nozzles === SINGLE && channels === 96) {
    primaryNozzle = 'H12'
  } else if (nozzles === SINGLE && channels === 8) {
    primaryNozzle = 'H1'
  }

  const commands = [
    {
      commandType: 'configureNozzleLayout' as const,
      key: uuid(),
      params: {
        pipetteId,
        configurationParams: {
          primaryNozzle,
          style: nozzles,
        },
      },
    },
  ]
  return {
    commands,
  }
}
