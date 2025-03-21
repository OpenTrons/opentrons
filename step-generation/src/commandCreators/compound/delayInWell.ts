import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { delay, moveToWell } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface DelayInWellArgs {
  pipetteId: string
  destinationId: string
  well: string
  zOffset: number
  seconds: number
}

export const delayInWell: CommandCreator<DelayInWellArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { destinationId, well, zOffset, seconds, pipetteId } = args

  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToWell, {
      pipetteId: pipetteId,
      labwareId: destinationId,
      wellName: well,
      wellLocation: {
        origin: 'bottom',
        offset: { x: 0, y: 0, z: zOffset },
      },
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
