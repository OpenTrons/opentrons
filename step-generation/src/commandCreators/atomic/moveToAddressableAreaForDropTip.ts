import { uuid } from '../../utils'
import type { MoveToAddressableAreaForDropTipParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

export const moveToAddressableAreaForDropTip: CommandCreator<MoveToAddressableAreaForDropTipParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, addressableAreaName } = args

  const commands = [
    {
      commandType: 'moveToAddressableAreaForDropTip' as const,
      key: uuid(),
      params: {
        pipetteId,
        addressableAreaName,
        offset: { x: 0, y: 0, z: 0 },
        alternateDropLocation: true,
      },
    },
  ]
  return {
    commands,
  }
}
