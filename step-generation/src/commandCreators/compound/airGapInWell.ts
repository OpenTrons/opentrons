import { curryWithoutPython, reduceCommandCreators } from '../../utils'
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
  const pipettePythonName =
    invariantContext.pipetteEntities[pipetteId].pythonName

  const prepareToAspirateCommand =
    type === 'aspirate'
      ? []
      : [
          curryWithoutPython(prepareToAspirate, {
            pipetteId,
          }),
        ]

  const pythonCommandCreator: CurriedCommandCreator = () => ({
    commands: [],
    python: `${pipettePythonName}.air_gap(volume=${volume}, height=${AIR_GAP_OFFSET_FROM_TOP})`,
  })

  const commandCreators = [
    curryWithoutPython(moveToWell, {
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
    curryWithoutPython(airGapInPlace, {
      pipetteId,
      volume,
      flowRate,
    }),
    pythonCommandCreator,
  ]

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
