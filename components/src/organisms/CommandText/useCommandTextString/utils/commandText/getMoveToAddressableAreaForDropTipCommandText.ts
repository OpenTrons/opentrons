import { getAddressableAreaDisplayName } from '../getAddressableAreaDisplayName'

import type { MoveToAddressableAreaForDropTipRunTimeCommand } from '@opentrons/shared-data/command'
import type { HandlesCommands } from '../types'

export function getMoveToAddressableAreaForDropTipCommandText({
  command,
  commandTextData,
  t,
}: HandlesCommands<MoveToAddressableAreaForDropTipRunTimeCommand>): string {
  const addressableAreaDisplayName =
    commandTextData != null
      ? getAddressableAreaDisplayName(commandTextData.commands, command.id, t)
      : null

  return t('move_to_addressable_area_drop_tip', {
    addressable_area: addressableAreaDisplayName,
  })
}
