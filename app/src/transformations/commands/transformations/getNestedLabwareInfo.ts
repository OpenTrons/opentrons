import type {
  LabwareDefinition2,
  LoadLabwareRunTimeCommand,
  LoadModuleRunTimeCommand,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { LabwareSetupItem } from './getLabwareSetupItemGroups'

export interface NestedLabwareInfo {
  nestedLabwareDisplayName: string
  //    shared location between labware and adapter
  sharedSlotId: string
  nestedLabwareDefinition?: LabwareDefinition2
  nestedLabwareNickName?: string
}
export function getNestedLabwareInfo(
  labwareSetupItem: LabwareSetupItem,
  commands: RunTimeCommand[]
): NestedLabwareInfo | null {
  const nestedLabware = commands.find(
    (command): command is LoadLabwareRunTimeCommand =>
      command.commandType === 'loadLabware' &&
      command.params.location !== 'offDeck' &&
      command.params.location !== 'systemLocation' &&
      'labwareId' in command.params.location &&
      command.params.location.labwareId === labwareSetupItem.labwareId
  )
  if (nestedLabware == null) return null

  let sharedSlotId: string = ''
  if (
    labwareSetupItem.initialLocation !== 'offDeck' &&
    labwareSetupItem.initialLocation !== 'systemLocation'
  ) {
    const adapterLocation = labwareSetupItem.initialLocation
    if ('slotName' in adapterLocation) {
      sharedSlotId = adapterLocation.slotName
    } else if ('moduleId' in adapterLocation) {
      const moduleLocationUnderAdapter = commands.find(
        (command): command is LoadModuleRunTimeCommand =>
          command.commandType === 'loadModule' &&
          command.result?.moduleId === adapterLocation.moduleId
      )
      sharedSlotId = moduleLocationUnderAdapter?.params.location.slotName ?? ''
    }
  }
  return {
    nestedLabwareDefinition: nestedLabware.result?.definition ?? undefined,
    nestedLabwareDisplayName:
      nestedLabware.result?.definition.metadata.displayName ?? '',
    nestedLabwareNickName:
      //  only display nickName if the user defined it
      nestedLabware.params.displayName !==
      nestedLabware.result?.definition.metadata.displayName
        ? nestedLabware.params.displayName
        : undefined,
    sharedSlotId,
  }
}
