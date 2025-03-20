import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { airGapInPlace, moveToWell, prepareToAspirate } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface AirGapInWellArgs {
  flowRate: number
  offsetFromBottomMm: number
  pipetteId: string
  volume: number
  labwareId: string
  wellName: string
}

export const airGapInWell: CommandCreator<AirGapInWellArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const {
    labwareId,
    wellName,
    flowRate,
    offsetFromBottomMm,
    pipetteId,
    volume,
  } = args

  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToWell, {
      pipetteId,
      labwareId,
      wellName,
      wellLocation: {
        origin: 'bottom',
        offset: {
          z: offsetFromBottomMm,
          x: 0,
          y: 0,
        },
      },
    }),
    curryCommandCreator(prepareToAspirate, {
      pipetteId,
    }),
    curryCommandCreator(airGapInPlace, {
      pipetteId,
      volume,
      flowRate,
    }),
  ]

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
