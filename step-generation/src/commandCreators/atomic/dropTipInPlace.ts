import { uuid } from '../../utils'
import type { CommandCreator } from '../../types'
import type { DropTipInPlaceParams } from '@opentrons/shared-data'

export const dropTipInPlace: CommandCreator<DropTipInPlaceParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId } = args
  // No-op if there is no tip
  if (!prevRobotState.tipState.pipettes[pipetteId]) {
    return {
      commands: [],
    }
  }

  const commands = [
    {
      commandType: 'dropTipInPlace' as const,
      key: uuid(),
      params: {
        pipetteId,
      },
    },
  ]
  return {
    commands,
  }
}
