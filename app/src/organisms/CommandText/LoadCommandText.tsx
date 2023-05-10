import { useTranslation } from 'react-i18next'
import {
  getModuleDisplayName,
  getModuleType,
  getOccludedSlotCountForModule,
} from '@opentrons/shared-data'
import {
  getPipetteNameSpecs,
  OT2_STANDARD_MODEL,
} from '@opentrons/shared-data/js'

import type {
  RunTimeCommand,
  CompletedProtocolAnalysis,
} from '@opentrons/shared-data'
import {
  getLabwareName,
  getPipetteNameOnMount,
  getModuleModel,
  getModuleDisplayLocation,
  getLiquidDisplayName,
} from './utils'

interface LoadCommandTextProps {
  command: RunTimeCommand
  robotSideAnalysis: CompletedProtocolAnalysis
}

export const LoadCommandText = ({
  command,
  robotSideAnalysis,
}: LoadCommandTextProps): JSX.Element | null => {
  const { t } = useTranslation('run_details')

  switch (command.commandType) {
    case 'loadPipette': {
      const pipetteModel = getPipetteNameOnMount(
        robotSideAnalysis,
        command.params.mount
      )
      return t('load_pipette_protocol_setup', {
        pipette_name:
          pipetteModel != null
            ? getPipetteNameSpecs(pipetteModel)?.displayName ?? ''
            : '',
        mount_name: command.params.mount === 'left' ? t('left') : t('right'),
      })
    }
    case 'loadModule': {
      const occludedSlotCount = getOccludedSlotCountForModule(
        getModuleType(command.params.model),
        robotSideAnalysis.robotType ?? OT2_STANDARD_MODEL
      )
      return t('load_module_protocol_setup', {
        count: occludedSlotCount,
        module: getModuleDisplayName(command.params.model),
        slot_name: command.params.location.slotName,
      })
    }
    case 'loadLabware': {
      if (
        command.params.location !== 'offDeck' &&
        'moduleId' in command.params.location
      ) {
        const moduleModel = getModuleModel(
          robotSideAnalysis,
          command.params.location.moduleId
        )
        const moduleName =
          moduleModel != null ? getModuleDisplayName(moduleModel) : ''

        return t('load_labware_info_protocol_setup', {
          count:
            moduleModel != null
              ? getOccludedSlotCountForModule(
                  getModuleType(moduleModel),
                  robotSideAnalysis.robotType ?? OT2_STANDARD_MODEL
                )
              : 1,
          labware: command.result?.definition.metadata.displayName,
          slot_name: getModuleDisplayLocation(
            robotSideAnalysis,
            command.params.location.moduleId
          ),
          module_name: moduleName,
        })
      } else {
        const labware = command.result?.definition.metadata.displayName
        return command.params.location === 'offDeck'
          ? t('load_labware_info_protocol_setup_off_deck', { labware })
          : t('load_labware_info_protocol_setup_no_module', {
              labware,
              slot_name: command.params.location?.slotName,
            })
      }
    }
    case 'loadLiquid': {
      const { liquidId, labwareId } = command.params
      return t('load_liquids_info_protocol_setup', {
        liquid: getLiquidDisplayName(robotSideAnalysis, liquidId),
        labware: getLabwareName(robotSideAnalysis, labwareId),
      })
    }
    default: {
      console.warn(
        'LoadCommandText encountered a command with an unrecognized commandType: ',
        command
      )
      return null
    }
  }
}
