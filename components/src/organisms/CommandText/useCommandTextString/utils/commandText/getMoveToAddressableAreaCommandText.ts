import { getAddressableAreaDisplayName } from '../getAddressableAreaDisplayName'

import type { MoveToAddressableAreaRunTimeCommand } from '@opentrons/shared-data/command'
import type { HandlesCommands } from '../types'

export function getMoveToAddressableAreaCommandText({
  command,
  commandTextData,
  t,
}: HandlesCommands<MoveToAddressableAreaRunTimeCommand>): string {
  const addressableAreaDisplayName =
    commandTextData != null
      ? getAddressableAreaDisplayName(commandTextData.commands, command.id, t)
      : null

  return t('move_to_addressable_area', {
    addressable_area: addressableAreaDisplayName,
  })
}
