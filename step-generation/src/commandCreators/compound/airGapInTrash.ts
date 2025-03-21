import { reduceCommandCreators, curryCommandCreator } from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import {
  airGapInPlace,
  moveToAddressableArea,
  prepareToAspirate,
} from '../atomic'
import type { CurriedCommandCreator, CommandCreator } from '../../types'

interface AirGapInTrashParams {
  pipetteId: string
  flowRate: number
  volume: number
  trashId: string
}
export const airGapInTrash: CommandCreator<AirGapInTrashParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, trashId, flowRate, volume } = args
  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      fixtureId: trashId,
      offset: ZERO_OFFSET,
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
