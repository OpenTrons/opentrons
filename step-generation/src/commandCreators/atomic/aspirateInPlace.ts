import { uuid } from '../../utils'
import type { CommandCreator } from '../../types'
import type { AspirateInPlaceParams } from '@opentrons/shared-data'

export const aspirateInPlace: CommandCreator<AspirateInPlaceParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, volume, flowRate } = args

  const commands = [
    {
      commandType: 'aspirateInPlace' as const,
      key: uuid(),
      params: {
        pipetteId,
        volume,
        flowRate,
      },
    },
  ]
  return {
    commands,
  }
}
