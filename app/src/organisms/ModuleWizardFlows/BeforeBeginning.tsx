import * as React from 'react'
import { UseMutateFunction } from 'react-query'
import { Trans, useTranslation } from 'react-i18next'
import {
  HEATERSHAKER_MODULE_MODELS,
  TEMPERATURE_MODULE_MODELS,
  THERMOCYCLER_MODULE_MODELS,
} from '@opentrons/shared-data/js/constants'
import { getModuleDisplayName } from '@opentrons/shared-data'
import { StyledText } from '../../atoms/text'
import { GenericWizardTile } from '../../molecules/GenericWizardTile'
import { SimpleWizardBody } from '../../molecules/SimpleWizardBody'
import { WizardRequiredEquipmentList } from '../../molecules/WizardRequiredEquipmentList'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SIZE_1,
  SPACING,
} from '@opentrons/components'
import type {
  CreateMaintenanceRunData,
  MaintenanceRun,
} from '@opentrons/api-client'
import type { AxiosError } from 'axios'
import type { ModuleCalibrationWizardStepProps } from './types'

interface BeforeBeginningProps extends ModuleCalibrationWizardStepProps {
  createMaintenanceRun: UseMutateFunction<
    MaintenanceRun,
    AxiosError<any>,
    CreateMaintenanceRunData,
    unknown
  >
  isCreateLoading: boolean
  errorMessage: string | null
}

export const BeforeBeginning = (
  props: BeforeBeginningProps
): JSX.Element | null => {
  const {
    proceed,
    createMaintenanceRun,
    isCreateLoading,
    attachedModule,
    maintenanceRunId,
    errorMessage,
  } = props
  const { t } = useTranslation(['module_wizard_flows', 'shared'])
  React.useEffect(() => {
    createMaintenanceRun({})
  }, [])
  const moduleDisplayName = getModuleDisplayName(attachedModule.moduleModel)

  let adapterLoadname
  if (
    THERMOCYCLER_MODULE_MODELS.some(
      model => model === attachedModule.moduleModel
    )
  ) {
    adapterLoadname = 'calibration_adapter_thermocycler'
  } else if (
    HEATERSHAKER_MODULE_MODELS.some(
      model => model === attachedModule.moduleModel
    )
  ) {
    adapterLoadname = 'calibration_adapter_heater_shaker'
  } else if (
    TEMPERATURE_MODULE_MODELS.some(
      model => model === attachedModule.moduleModel
    )
  ) {
    adapterLoadname = 'calibration_adapter_temperature_module'
  } else {
    throw new Error('Invalid module for calibration.')
  }
  const equipmentList = [
    { loadName: 'calibration_probe', displayName: t('pipette_probe') },
    { loadName: adapterLoadname, displayName: t('cal_adapter') },
  ]

  return errorMessage != null ? (
    <SimpleWizardBody
      isSuccess={false}
      iconColor={COLORS.errorEnabled}
      header={t('shared:error_encountered')}
      subHeader={errorMessage}
    />
  ) : (
    <GenericWizardTile
      header={t('calibration', { module: moduleDisplayName })}
      rightHandBody={
        <WizardRequiredEquipmentList equipmentList={equipmentList} />
      }
      bodyText={
        <Trans
          t={t}
          i18nKey={'get_started'}
          values={{ module: moduleDisplayName }}
          components={{ block: <StyledText as="p" /> }}
        />
      }
      proceedButtonText={t('move_gantry_to_front')}
      proceedIsDisabled={isCreateLoading || maintenanceRunId == null}
      proceed={proceed}
    />
  )
}
