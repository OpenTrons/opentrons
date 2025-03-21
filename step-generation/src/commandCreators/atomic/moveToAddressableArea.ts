import { uuid } from '../../utils'
import type { MoveToAddressableAreaParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

export const moveToAddressableArea: CommandCreator<MoveToAddressableAreaParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, addressableAreaName, offset } = args

  const commands = [
    {
      commandType: 'moveToAddressableArea' as const,
      key: uuid(),
      params: {
        pipetteId,
        addressableAreaName,
        offset,
      },
    },
  ]
  return {
    commands,
  }
}
