import { findLastAt } from './helpers'

import type {
  LabwareLocation,
  RunTimeCommand,
  LoadLabwareRunTimeCommand,
  MoveLabwareRunTimeCommand,
  LabwareLocationSequence,
} from '@opentrons/shared-data'

/**
 * given a list of commands and a labwareId, calculate the resulting location
 * of the corresponding labware after all given commands are executed
 * @param labwareId target labware
 * @param commands list of commands to search within
 * @returns LabwareLocation object of the resulting location of the target labware after all commands execute
 */
export function getFinalLabwareLocation(
  labwareId: string,
  commands: RunTimeCommand[]
): { location?: LabwareLocation; locationSequence?: LabwareLocationSequence } {
  const [lastMove, lastMoveIndex] = findLastAt(
    commands,
    (c: RunTimeCommand): c is MoveLabwareRunTimeCommand =>
      c.commandType === 'moveLabware' && c.params.labwareId === labwareId
  )

  const [lastLoad, lastLoadIndex] = findLastAt(
    commands,
    (c: RunTimeCommand): c is LoadLabwareRunTimeCommand =>
      c.commandType === 'loadLabware' && c.result?.labwareId === labwareId
  )
  if (lastMoveIndex > lastLoadIndex) {
    return {
      location: lastMove?.params?.newLocation,
      locationSequence: lastMove?.result?.immediateDestinationLocationSequence,
    }
  } else if (lastLoadIndex > lastMoveIndex) {
    return {
      location: lastLoad?.params?.location,
      locationSequence: lastLoad?.result?.locationSequence,
    }
  } else {
    return {}
  }
}
