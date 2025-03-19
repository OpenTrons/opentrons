import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { airGapInPlace, moveToWell, prepareToAspirate } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface AirGapInWellArgs {
  flowRate: number
  offsetFromTopMm: number
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
    offsetFromTopMm,
    pipetteId,
    volume,
  } = args

  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToWell, {
      pipetteId,
      labwareId,
      wellName,
      wellLocation: {
        origin: 'top',
        offset: {
          z: offsetFromTopMm,
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
