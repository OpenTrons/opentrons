import {
  getTrashBinAddressableAreaName,
  getWasteChuteAddressableAreaNamePip,
  uuid,
} from '../../utils'
import type {
  AddressableAreaName,
  CutoutId,
  MoveToAddressableAreaParams,
} from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

interface MoveToAddressableAreaAtomicParams
  extends Omit<MoveToAddressableAreaParams, 'addressableAreaName'> {
  fixtureId: string
}
export const moveToAddressableArea: CommandCreator<MoveToAddressableAreaAtomicParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { pipetteId, fixtureId, offset } = args
  const {
    pipetteEntities,
    trashBinEntities,
    wasteChuteEntities,
  } = invariantContext
  const pipetteEntity = pipetteEntities[pipetteId]
  const pipetteChannels = pipetteEntity.spec.channels
  const pipettePythonName = pipetteEntity.pythonName
  const fixtureEntity =
    trashBinEntities[fixtureId] != null
      ? trashBinEntities[fixtureId]
      : wasteChuteEntities[fixtureId]
  const fixturePythonName = fixtureEntity.pythonName

  let addressableAreaName: AddressableAreaName = getWasteChuteAddressableAreaNamePip(
    pipetteChannels
  )
  if (trashBinEntities[fixtureId] != null) {
    addressableAreaName = getTrashBinAddressableAreaName(
      fixtureEntity.location as CutoutId
    )
  }

  const commands = [
    {
      commandType: 'moveToAddressableArea' as const,
      key: uuid(),
      params: {
        pipetteId,
        addressableAreaName,
        offset,
      },
    },
  ]
  return {
    commands,
    python: `${pipettePythonName}.move_to(${fixturePythonName})`,
  }
}
