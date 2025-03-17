import {
  getTrashBinAddressableAreaName,
  reduceCommandCreators,
  curryCommandCreator,
} from '../../utils'
import { ZERO_OFFSET } from '../../constants'
import { blowOutInPlace, moveToAddressableArea } from '../atomic'
import type { CurriedCommandCreator, CommandCreator } from '../../types'
import type { CutoutId } from '@opentrons/shared-data'

interface BlowOutInTrashParams {
  pipetteId: string
  flowRate: number
  trashLocation: CutoutId
}
export const blowOutInTrash: CommandCreator<BlowOutInTrashParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, trashLocation, flowRate } = args
  const addressableAreaName = getTrashBinAddressableAreaName(trashLocation)
  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(moveToAddressableArea, {
      pipetteId,
      addressableAreaName,
      offset: ZERO_OFFSET,
    }),
    curryCommandCreator(blowOutInPlace, {
      pipetteId,
      flowRate,
    }),
  ]

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
