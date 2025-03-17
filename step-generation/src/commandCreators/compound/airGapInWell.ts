import {
  curryCommandCreator,
  getDispenseAirGapLocation,
  reduceCommandCreators,
} from '../../utils'
import { airGapInPlace, moveToWell, prepareToAspirate } from '../atomic'
import type { CommandCreator, CurriedCommandCreator } from '../../types'

interface AirGapInWellArgs {
  destinationId: string
  destWell: string
  flowRate: number
  offsetFromBottomMm: number
  pipetteId: string
  volume: number
  blowOutLocation?: string | null
  sourceId?: string
  sourceWell?: string
}

export const airGapInWell: CommandCreator<AirGapInWellArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const {
    blowOutLocation,
    destinationId,
    destWell,
    flowRate,
    offsetFromBottomMm,
    pipetteId,
    sourceId,
    sourceWell,
    volume,
  } = args

  //    air gap for multi-wells for consolidate
  let labwareId = destinationId
  let wellName = destWell

  //    air gap out of 1 well for transfer
  if (sourceId != null && sourceWell != null) {
    const {
      dispenseAirGapLabware,
      dispenseAirGapWell,
    } = getDispenseAirGapLocation({
      blowoutLocation: blowOutLocation,
      sourceLabware: sourceId,
      destLabware: destinationId,
      sourceWell,
      destWell: destWell,
    })
    labwareId = dispenseAirGapLabware
    wellName = dispenseAirGapWell
  }

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
