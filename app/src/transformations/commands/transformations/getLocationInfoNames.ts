import {
  getLabwareDisplayName,
  getLabwareStackCountAndLocation,
} from '@opentrons/shared-data'

import type {
  LoadLabwareRunTimeCommand,
  RunTimeCommand,
  LoadModuleRunTimeCommand,
  ModuleModel,
} from '@opentrons/shared-data'

export interface LocationInfoNames {
  slotName: string
  labwareName: string
  labwareNickname?: string
  labwareQuantity: number
  adapterName?: string
  moduleModel?: ModuleModel
  adapterId?: string
}

export function getLocationInfoNames(
  labwareId: string,
  commands?: RunTimeCommand[]
): LocationInfoNames {
  const loadLabwareCommands = commands?.filter(
    (command): command is LoadLabwareRunTimeCommand =>
      command.commandType === 'loadLabware'
  )
  const loadLabwareCommand = loadLabwareCommands?.find(
    command => command.result?.labwareId === labwareId
  )
  const loadModuleCommands = commands?.filter(
    (command): command is LoadModuleRunTimeCommand =>
      command.commandType === 'loadModule'
  )
  if (loadLabwareCommands == null || loadLabwareCommand == null) {
    console.warn(
      `could not find the load labware command assosciated with thie labwareId: ${labwareId}`
    )
    return { slotName: '', labwareName: '', labwareQuantity: 0 }
  }

  const labwareName =
    loadLabwareCommand.result?.definition != null
      ? getLabwareDisplayName(loadLabwareCommand.result?.definition)
      : ''
  const labwareNickname = loadLabwareCommand.params.displayName

  const { labwareLocation, labwareQuantity } = getLabwareStackCountAndLocation(
    labwareId,
    loadLabwareCommands
  )

  if (labwareLocation === 'offDeck' || labwareLocation === 'systemLocation') {
    return { slotName: 'Off deck', labwareName, labwareQuantity }
  } else if ('slotName' in labwareLocation) {
    return { slotName: labwareLocation.slotName, labwareName, labwareQuantity }
  } else if ('addressableAreaName' in labwareLocation) {
    return {
      slotName: labwareLocation.addressableAreaName,
      labwareName,
      labwareQuantity,
    }
  } else if ('moduleId' in labwareLocation) {
    const loadModuleCommandUnderLabware = loadModuleCommands?.find(
      command => command.result?.moduleId === labwareLocation.moduleId
    )
    return loadModuleCommandUnderLabware != null &&
      'location' in loadModuleCommandUnderLabware.params
      ? {
          slotName:
            loadModuleCommandUnderLabware?.params.location.slotName ?? '',
          labwareName,
          moduleModel: loadModuleCommandUnderLabware?.params.model,
          labwareQuantity,
        }
      : { slotName: '', labwareName: '', labwareQuantity }
  } else {
    // adapt this to return the adapter only if the role of this labware is adapter -- otherwise, keep parsing through until you find out how many identical labware there are
    const loadedAdapterCommand = loadLabwareCommands?.find(command =>
      command.result != null
        ? command.result?.labwareId === labwareLocation.labwareId
        : ''
    )
    if (loadedAdapterCommand?.params == null) {
      console.warn(
        `expected to find an adapter under the labware but could not with labwareId ${labwareLocation.labwareId}`
      )
      return { slotName: '', labwareName: labwareName, labwareQuantity }
    } else if (
      loadedAdapterCommand?.params.location !== 'offDeck' &&
      loadedAdapterCommand?.params.location !== 'systemLocation' &&
      'slotName' in loadedAdapterCommand?.params.location
    ) {
      return {
        slotName: loadedAdapterCommand?.params.location.slotName,
        labwareName,
        labwareNickname,
        adapterName:
          loadedAdapterCommand?.result?.definition.metadata.displayName,
        adapterId: loadedAdapterCommand?.result?.labwareId,
        labwareQuantity,
      }
    } else if (
      loadedAdapterCommand?.params.location !== 'offDeck' &&
      loadedAdapterCommand?.params.location !== 'systemLocation' &&
      'addressableAreaName' in loadedAdapterCommand?.params.location
    ) {
      return {
        slotName: loadedAdapterCommand?.params.location.addressableAreaName,
        labwareName,
        labwareNickname,
        adapterName:
          loadedAdapterCommand?.result?.definition.metadata.displayName,
        adapterId: loadedAdapterCommand?.result?.labwareId,
        labwareQuantity,
      }
    } else if (
      loadedAdapterCommand?.params.location !== 'offDeck' &&
      loadedAdapterCommand?.params.location !== 'systemLocation' &&
      'moduleId' in loadedAdapterCommand?.params.location
    ) {
      const moduleId = loadedAdapterCommand?.params.location.moduleId
      const loadModuleCommandUnderAdapter = loadModuleCommands?.find(
        command => command.result?.moduleId === moduleId
      )

      return loadModuleCommandUnderAdapter != null &&
        'location' in loadModuleCommandUnderAdapter.params
        ? {
            slotName: loadModuleCommandUnderAdapter.params.location.slotName,
            labwareName,
            labwareNickname,
            adapterName:
              loadedAdapterCommand.result?.definition.metadata.displayName,
            adapterId: loadedAdapterCommand?.result?.labwareId,
            moduleModel: loadModuleCommandUnderAdapter.params.model,
            labwareQuantity,
          }
        : { slotName: '', labwareName, labwareQuantity }
    } else {
      //  shouldn't hit this
      return { slotName: '', labwareName, labwareQuantity }
    }
  }
}
