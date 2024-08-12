import { getLabwareDefURI } from '@opentrons/shared-data'

import { getLoadedLabware } from '../../../utils/accessors'
import {
  getLabwareName,
  getLabwareDisplayLocation,
  getFinalLabwareLocation,
  getWellRange,
  getLabwareDefinitionsFromCommands,
} from '../../../utils'

import type { PipetteName, RunTimeCommand } from '@opentrons/shared-data'
import type { TFunction } from 'i18next'
import type { GetCommandText } from '..'

export const getPipettingCommandText = ({
  command,
  commandTextData,
  robotType,
  t,
}: GetCommandText): string => {
  const labwareId =
    command != null && 'labwareId' in command.params
      ? (command.params.labwareId as string)
      : ''
  const wellName =
    command != null && 'wellName' in command.params
      ? command.params.wellName
      : ''

  const allPreviousCommands = commandTextData?.commands.slice(
    0,
    commandTextData.commands.findIndex(c => c.id === command?.id)
  )
  const labwareLocation =
    allPreviousCommands != null
      ? getFinalLabwareLocation(
          labwareId,
          allPreviousCommands as RunTimeCommand[]
        )
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

  switch (command?.commandType) {
    case 'aspirate': {
      const { volume, flowRate } = command.params
      return t('aspirate', {
        well_name: wellName,
        labware:
          commandTextData != null
            ? getLabwareName(commandTextData, labwareId)
            : null,
        labware_location: displayLocation,
        volume,
        flow_rate: flowRate,
      })
    }
    case 'dispense': {
      const { volume, flowRate, pushOut } = command.params
      return pushOut != null
        ? t('dispense_push_out', {
            well_name: wellName,
            labware:
              commandTextData != null
                ? getLabwareName(commandTextData, labwareId)
                : null,
            labware_location: displayLocation,
            volume,
            flow_rate: flowRate,
            push_out_volume: pushOut,
          })
        : t('dispense', {
            well_name: wellName,
            labware:
              commandTextData != null
                ? getLabwareName(commandTextData, labwareId)
                : null,
            labware_location: displayLocation,
            volume,
            flow_rate: flowRate,
          })
    }
    case 'blowout': {
      const { flowRate } = command.params
      return t('blowout', {
        well_name: wellName,
        labware:
          commandTextData != null
            ? getLabwareName(commandTextData, labwareId)
            : null,
        labware_location: displayLocation,
        flow_rate: flowRate,
      })
    }
    case 'dropTip': {
      const loadedLabware =
        commandTextData != null
          ? getLoadedLabware(commandTextData, labwareId)
          : null
      const labwareDefinitions =
        commandTextData != null
          ? getLabwareDefinitionsFromCommands(
              commandTextData.commands as RunTimeCommand[]
            )
          : null
      const labwareDef = labwareDefinitions?.find(
        lw => getLabwareDefURI(lw) === loadedLabware?.definitionUri
      )
      return Boolean(labwareDef?.parameters.isTiprack)
        ? t('return_tip', {
            well_name: wellName,
            labware:
              commandTextData != null
                ? getLabwareName(commandTextData, labwareId)
                : null,
            labware_location: displayLocation,
          })
        : t('drop_tip', {
            well_name: wellName,
            labware:
              commandTextData != null
                ? getLabwareName(commandTextData, labwareId)
                : null,
          })
    }
    case 'pickUpTip': {
      const pipetteId = command.params.pipetteId
      const pipetteName:
        | PipetteName
        | undefined = commandTextData?.pipettes.find(
        pipette => pipette.id === pipetteId
      )?.pipetteName

      return t('pickup_tip', {
        well_range:
          allPreviousCommands != null
            ? getWellRange(
                pipetteId,
                allPreviousCommands as RunTimeCommand[],
                wellName as string,
                pipetteName
              )
            : null,
        labware:
          commandTextData != null
            ? getLabwareName(commandTextData, labwareId)
            : null,
        labware_location: displayLocation,
      })
    }
    case 'dropTipInPlace': {
      return t('drop_tip_in_place')
    }
    case 'dispenseInPlace': {
      const { volume, flowRate } = command.params
      return t('dispense_in_place', { volume, flow_rate: flowRate })
    }
    case 'blowOutInPlace': {
      const { flowRate } = command.params
      return t('blowout_in_place', { flow_rate: flowRate })
    }
    case 'aspirateInPlace': {
      const { flowRate, volume } = command.params
      return t('aspirate_in_place', { volume, flow_rate: flowRate })
    }
    default: {
      console.warn(
        'PipettingCommandText encountered a command with an unrecognized commandType: ',
        command
      )
      return ''
    }
  }
}
