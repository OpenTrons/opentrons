import type { MoveLabwareParams } from '@opentrons/shared-data'
import type { InvariantContext, RobotStateAndWarnings } from '../types'

export function forMoveLabware(
  params: MoveLabwareParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void {
  const { labwareId, newLocation } = params
  const { robotState } = robotStateAndWarnings

  let newLocationString = ''
  if (newLocation === 'offDeck' || newLocation === 'systemLocation') {
    newLocationString = newLocation
  } else if ('moduleId' in newLocation) {
    newLocationString = newLocation.moduleId
  } else if ('slotName' in newLocation) {
    newLocationString = newLocation.slotName
  } else if ('labwareId' in newLocation) {
    newLocationString = newLocation.labwareId
  } else if ('addressableAreaName' in newLocation) {
    newLocationString = newLocation.addressableAreaName
  }

  robotState.labware[labwareId].slot = newLocationString
}
