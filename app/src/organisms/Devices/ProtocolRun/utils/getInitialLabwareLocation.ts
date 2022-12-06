import { FIXED_TRASH_ID } from '@opentrons/shared-data/js'
import type { RunTimeCommand } from '@opentrons/shared-data'
import type {
  LoadLabwareRunTimeCommand,
  LabwareLocation,
} from '@opentrons/shared-data/protocol/types/schemaV6/command/setup'

export const getInitialLabwareLocation = (
  labwareId: string,
  commands: RunTimeCommand[]
): LabwareLocation => {
  if (labwareId === FIXED_TRASH_ID) {
    return { slotName: '12' }
  }
  const labwareLocation = commands.find(
    (command: RunTimeCommand): command is LoadLabwareRunTimeCommand =>
      command.commandType === 'loadLabware' &&
      command.result?.labwareId === labwareId
  )?.params?.location

  if (labwareLocation == null) {
    throw new Error(
      'expected to be able to find labware location, but could not'
    )
  }

  return labwareLocation
}
