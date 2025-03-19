import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { AIR_GAP_OFFSET_FROM_TOP } from '../../constants'
import { airGapInPlace, moveToWell, prepareToAspirate } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

export type AirGapInWellType = 'aspirate' | 'dispense'

interface AirGapInWellArgs {
  type: AirGapInWellType
  flowRate: number
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
  const { labwareId, wellName, flowRate, pipetteId, volume, type } = args

  const prepareToAspirateCommand =
    type === 'aspirate'
      ? []
      : [
          curryCommandCreator(prepareToAspirate, {
            pipetteId,
          }),
        ]

  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToWell, {
      pipetteId,
      labwareId,
      wellName,
      wellLocation: {
        origin: 'top',
        offset: {
          z: AIR_GAP_OFFSET_FROM_TOP,
          x: 0,
          y: 0,
        },
      },
    }),
    ...prepareToAspirateCommand,
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
