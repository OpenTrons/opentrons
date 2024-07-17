import { getAddressableAreaDisplayName } from '../../../utils'

import type { MoveToAddressableAreaRunTimeCommand } from '@opentrons/shared-data/command'
import type { GetCommandText } from '..'

type GetMoveToAddressableAreaCommandText = Omit<GetCommandText, 'command'> & {
  command: MoveToAddressableAreaRunTimeCommand
}

export function getMoveToAddressableAreaCommandText({
  command,
  commandTextData,
  t,
}: GetMoveToAddressableAreaCommandText): string {
  const addressableAreaDisplayName =
    commandTextData != null
      ? getAddressableAreaDisplayName(commandTextData, command.id, t)
      : null

  return t('move_to_addressable_area', {
    addressable_area: addressableAreaDisplayName,
  })
}
