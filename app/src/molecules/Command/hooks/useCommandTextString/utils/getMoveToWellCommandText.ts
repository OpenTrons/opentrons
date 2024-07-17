import type { MoveToWellRunTimeCommand } from '@opentrons/shared-data/command'
import type { GetCommandText } from '..'
import {
  getFinalLabwareLocation,
  getLabwareDisplayLocation,
  getLabwareName,
} from '../../../utils'
import type { TFunction } from 'i18next'

type GetMoveToWellCommandText = Omit<GetCommandText, 'command'> & {
  command: MoveToWellRunTimeCommand
}

export function getMoveToWellCommandText({
  command,
  t,
  commandTextData,
  robotType,
}: GetMoveToWellCommandText): string {
  const { wellName, labwareId } = command.params
  const allPreviousCommands = commandTextData?.commands.slice(
    0,
    commandTextData.commands.findIndex(c => c.id === command.id)
  )
  const labwareLocation =
    allPreviousCommands != null
      ? getFinalLabwareLocation(labwareId, allPreviousCommands)
      : null
  const displayLocation =
    labwareLocation != null && commandTextData != null
      ? getLabwareDisplayLocation(
          commandTextData,
          labwareLocation,
          t as TFunction,
          robotType
        )
      : ''

  return t('move_to_well', {
    well_name: wellName,
    labware:
      commandTextData != null
        ? getLabwareName(commandTextData, labwareId)
        : null,
    labware_location: displayLocation,
  })
}
