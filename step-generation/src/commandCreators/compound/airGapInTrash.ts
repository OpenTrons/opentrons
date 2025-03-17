import {
  getTrashBinAddressableAreaName,
  reduceCommandCreators,
  curryCommandCreator,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import {
  airGapInPlace,
  moveToAddressableArea,
  prepareToAspirate,
} from '../atomic'
import type { CurriedCommandCreator, CommandCreator } from '../../types'
import type { CutoutId } from '@opentrons/shared-data'

interface AirGapInTrashParams {
  pipetteId: string
  flowRate: number
  volume: number
  trashLocation: CutoutId
}
export const airGapInTrash: CommandCreator<AirGapInTrashParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, trashLocation, flowRate, volume } = args
  const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)
  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
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
