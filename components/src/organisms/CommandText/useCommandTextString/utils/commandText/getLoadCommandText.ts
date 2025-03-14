import find from 'lodash/find'
import {
  getAllLiquidClassDefs,
  getModuleDisplayName,
  getModuleType,
  getOccludedSlotCountForModule,
  getPipetteSpecsV2,
} from '@opentrons/shared-data'

import { getPipetteNameOnMount } from '../getPipetteNameOnMount'
import { getLiquidDisplayName } from '../getLiquidDisplayName'
import { getLabwareName } from '../getLabwareName'
import { getLabwareDisplayLocation } from '../getLabwareDisplayLocation'

import type { GetCommandText } from '../..'

export const getLoadCommandText = ({
  command,
  commandTextData,
  robotType,
  t,
  allRunDefs,
}: GetCommandText): string => {
  switch (command?.commandType) {
    case 'loadPipette': {
      const pipetteModel =
        commandTextData != null
          ? getPipetteNameOnMount(
              commandTextData.pipettes,
              command.params.mount
            )
          : null
      return t('load_pipette_protocol_setup', {
        pipette_name:
          pipetteModel != null
            ? getPipetteSpecsV2(pipetteModel)?.displayName ?? ''
            : '',
        mount_name: command.params.mount === 'left' ? t('left') : t('right'),
      })
    }
    case 'loadModule': {
      const occludedSlotCount = getOccludedSlotCountForModule(
        getModuleType(command.params.model),
        robotType
      )
      return t('load_module_protocol_setup', {
        count: occludedSlotCount,
        module: getModuleDisplayName(command.params.model),
        slot_name: command.params.location.slotName,
      })
    }
    case 'loadLid':
    case 'loadLabware': {
      const location =
        command.result?.locationSequence != null
          ? getLabwareDisplayLocation({
              locationSequence: command.result.locationSequence,
              robotType,
              allRunDefs,
              loadedLabwares: commandTextData?.labware ?? [],
              loadedModules: commandTextData?.modules ?? [],
              t,
            })
          : getLabwareDisplayLocation({
              location: command.params.location,
              robotType,
              allRunDefs,
              loadedLabwares: commandTextData?.labware ?? [],
              loadedModules: commandTextData?.modules ?? [],
              t,
            })
      const labwareName =
        'displayName' in command.params && command.params.displayName != null
          ? command.params.displayName
          : command.result?.definition.metadata.displayName

      // use in preposition for modules and slots, on for labware and adapters
      let displayLocation = t('in_location', { location })
      if (
        command.params.location === 'offDeck' ||
        command.params.location === 'systemLocation'
      ) {
        displayLocation = location
      } else if ('labwareId' in command.params.location) {
        displayLocation = t('on_location', { location })
      }

      return t('load_labware_to_display_location', {
        labware: labwareName,
        display_location: displayLocation,
      })
    }
    case 'loadLidStack': {
      // this will be the case if the system creates an empty stack to move lids onto
      if (command.result?.definition == null) {
        return t('load_lid_stack_empty')
      }
      const location =
        command.result?.stackLocationSequence != null
          ? getLabwareDisplayLocation({
              locationSequence: command.result.stackLocationSequence,
              robotType,
              allRunDefs,
              loadedLabwares: commandTextData?.labware ?? [],
              loadedModules: commandTextData?.modules ?? [],
              t,
            })
          : ''
      // use in preposition for modules and slots, on for labware and adapters
      let displayLocation = t('in_location', { location })
      if (
        command.params.location !== 'systemLocation' &&
        command.params.location !== 'offDeck' &&
        'labwareId' in command.params.location
      ) {
        displayLocation = t('on_location', { location })
      }
      const lidName = command.result.definition.metadata.displayName
      const quantity = command.params.quantity
      return t('load_lid_stack', {
        quantity,
        labware: lidName,
        display_location: displayLocation,
      })
    }
    case 'reloadLabware': {
      const { labwareId } = command.params
      const labware =
        commandTextData != null
          ? getLabwareName({
              loadedLabwares: commandTextData?.labware ?? [],
              labwareId,
              allRunDefs,
            })
          : null
      return t('reloading_labware', { labware })
    }
    case 'loadLiquid': {
      const { liquidId, labwareId } = command.params
      return t('load_liquids_info_protocol_setup', {
        liquid:
          commandTextData != null
            ? getLiquidDisplayName(commandTextData.liquids ?? [], liquidId)
            : null,
        labware:
          commandTextData != null
            ? getLabwareName({
                loadedLabwares: commandTextData?.labware ?? [],
                labwareId,
                allRunDefs,
              })
            : null,
      })
    }
    case 'loadLiquidClass': {
      const { liquidClassName } = command.params.liquidClassRecord
      const liquidClassDisplayName = find(
        getAllLiquidClassDefs(),
        liquidClassDef => liquidClassDef.liquidClassName === liquidClassName
      )?.displayName
      return t('load_liquid_class', {
        liquidClassDisplayName,
      })
    }
    default: {
      console.warn(
        'LoadCommandText encountered a command with an unrecognized commandType: ',
        command
      )
      return ''
    }
  }
}
