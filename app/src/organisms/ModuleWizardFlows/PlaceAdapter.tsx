import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import HeaterShaker_PlaceAdapter_L from '@opentrons/app/src/assets/videos/module_wizard_flows/HeaterShaker_PlaceAdapter_L.webm'
import HeaterShaker_PlaceAdapter_R from '@opentrons/app/src/assets/videos/module_wizard_flows/HeaterShaker_PlaceAdapter_R.webm'
import TempModule_PlaceAdapter_L from '@opentrons/app/src/assets/videos/module_wizard_flows/TempModule_PlaceAdapter_L.webm'
import TempModule_PlaceAdapter_R from '@opentrons/app/src/assets/videos/module_wizard_flows/TempModule_PlaceAdapter_R.webm'
import Thermocycler_PlaceAdapter from '@opentrons/app/src/assets/videos/module_wizard_flows/Thermocycler_PlaceAdapter.webm'

import {
  Flex,
  TYPOGRAPHY,
  SPACING,
  RESPONSIVENESS,
} from '@opentrons/components'
import { getModuleDisplayName } from '@opentrons/shared-data'

import { StyledText } from '../../atoms/text'
import { GenericWizardTile } from '../../molecules/GenericWizardTile'
import {
  HEATERSHAKER_MODULE_MODELS,
  TEMPERATURE_MODULE_MODELS,
  THERMOCYCLER_MODULE_MODELS,
} from '@opentrons/shared-data/js/constants'
import { LEFT_SLOTS } from './constants'

import type { ModuleCalibrationWizardStepProps } from './types'

interface PlaceAdapterProps extends ModuleCalibrationWizardStepProps {
  slotName: string
}

export const BODY_STYLE = css`
  ${TYPOGRAPHY.pRegular};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    font-size: 1.275rem;
    line-height: 1.75rem;
  }
`

export const PlaceAdapter = (props: PlaceAdapterProps): JSX.Element | null => {
  const { proceed, goBack, attachedModule, slotName } = props
  const { t } = useTranslation('module_wizard_flows')
  const moduleName = getModuleDisplayName(attachedModule.moduleModel)
  const handleOnClick = (): void => {
    // TODO: send calibration/moveToMaintenance command here for the pipette
    // that will be used in calibration
    proceed()
  }

  const bodyText = (
    <StyledText css={BODY_STYLE}>{t('place_flush', { moduleName })}</StyledText>
  )

  const moduleDisplayName = getModuleDisplayName(attachedModule.moduleModel)
  const isInLeftSlot = LEFT_SLOTS.some(slot => slot === slotName)

  let attachAdapterVideoSrc
  if (
    THERMOCYCLER_MODULE_MODELS.some(
      model => model === attachedModule.moduleModel
    )
  ) {
    attachAdapterVideoSrc = Thermocycler_PlaceAdapter
  } else if (
    HEATERSHAKER_MODULE_MODELS.some(
      model => model === attachedModule.moduleModel
    )
  ) {
    attachAdapterVideoSrc = isInLeftSlot
      ? HeaterShaker_PlaceAdapter_L
      : HeaterShaker_PlaceAdapter_R
  } else if (
    TEMPERATURE_MODULE_MODELS.some(
      model => model === attachedModule.moduleModel
    )
  ) {
    attachAdapterVideoSrc = isInLeftSlot
      ? TempModule_PlaceAdapter_L
      : TempModule_PlaceAdapter_R
  } else {
    attachAdapterVideoSrc = null
    console.error(
      `Invalid module type for calibration: ${attachedModule.moduleModel}`
    )
    return null
  }

  const placeAdapterVid = (
    <Flex height="13.25rem" paddingTop={SPACING.spacing4}>
      <video
        css={css`
          max-width: 100%;
          max-height: 100%;
        `}
        autoPlay={true}
        loop={true}
        controls={false}
      >
        <source src={attachAdapterVideoSrc} />
      </video>
    </Flex>
  )

  return (
    <GenericWizardTile
      header={t('place_adapter', { module: moduleDisplayName })}
      // TODO: swap this out with the right animation
      rightHandBody={placeAdapterVid}
      bodyText={bodyText}
      proceedButtonText={t('confirm_placement')}
      proceed={handleOnClick}
      back={goBack}
    />
  )
}
