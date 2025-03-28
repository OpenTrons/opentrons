import type {
  AddressableAreaName,
  MoveToAddressableAreaParams,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { TFunction } from 'i18next'

export function getAddressableAreaDisplayName(
  commands: RunTimeCommand[] | undefined,
  commandId: string,
  t: TFunction
): string {
  const addressableAreaCommand = (commands ?? []).find(
    command => command.id === commandId
  )

  if (
    addressableAreaCommand == null ||
    !('addressableAreaName' in addressableAreaCommand.params)
  ) {
    return ''
  }

  const addressableAreaName: MoveToAddressableAreaParams['addressableAreaName'] =
    addressableAreaCommand.params.addressableAreaName

  if (addressableAreaName.includes('movableTrash')) {
    const slotName = getMovableTrashSlot(addressableAreaName)
    return t('trash_bin_in_slot', { slot_name: slotName })
  } else if (addressableAreaName.includes('WasteChute')) {
    return t('waste_chute')
  } else if (addressableAreaName === 'fixedTrash') {
    return t('fixed_trash')
  } else {
    return addressableAreaName
  }
}

const getMovableTrashSlot = (
  addressableAreaName: AddressableAreaName
): string => {
  switch (addressableAreaName) {
    case 'movableTrashA1':
      return 'A1'
    case 'movableTrashA3':
      return 'A3'
    case 'movableTrashB1':
      return 'B1'
    case 'movableTrashB3':
      return 'B3'
    case 'movableTrashC1':
      return 'C1'
    case 'movableTrashC3':
      return 'C3'
    case 'movableTrashD1':
      return 'D1'
    case 'movableTrashD3':
      return 'D3'
    default:
      return ''
  }
}
