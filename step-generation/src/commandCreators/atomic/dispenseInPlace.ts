import { uuid } from '../../utils'
import type { CommandCreator } from '../../types'
import type { DispenseInPlaceParams } from '@opentrons/shared-data'

export const dispenseInPlace: CommandCreator<DispenseInPlaceParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, volume, flowRate } = args

  const commands = [
    {
      commandType: 'dispenseInPlace' as const,
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
