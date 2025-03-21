import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { delay, moveToAddressableArea } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface DelayInTrashArgs {
  destinationId: string
  pipetteId: string
  seconds: number
}

export const delayInTrash: CommandCreator<DelayInTrashArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { seconds, pipetteId, destinationId } = args

  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      fixtureId: destinationId,
      offset: ZERO_OFFSET,
    }),
    curryCommandCreator(delay, {
      seconds: seconds,
    }),
  ]

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
