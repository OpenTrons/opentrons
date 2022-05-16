import * as React from 'react'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  ALIGN_CENTER,
  JUSTIFY_SPACE_BETWEEN,
  Box,
  TYPOGRAPHY,
  SPACING,
} from '@opentrons/components'
import { StyledText } from '../../../../atoms/text'
import { ToggleButton } from '../../../../atoms/buttons'
import { updateSetting } from '../../../../redux/robot-settings'

import type { Dispatch } from '../../../../redux/types'
import type { RobotSettingsField } from '../../../../redux/robot-settings/types'

interface LegacySettingsProps {
  settings: RobotSettingsField | undefined
  robotName: string
}

export function LegacySettings({
  settings,
  robotName,
}: LegacySettingsProps): JSX.Element {
  const { t } = useTranslation('device_settings')
  const dispatch = useDispatch<Dispatch>()
  const value = settings?.value ? settings.value : false
  const id = settings?.id ? settings.id : 'deckCalibrationDots'

  return (
    <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
      <Box width="70%">
        <StyledText
          as="h2"
          css={TYPOGRAPHY.h3SemiBold}
          marginBottom={SPACING.spacing4}
          id="AdvancedSettings_showLink"
        >
          {t('legacy_settings')}
        </StyledText>
        <StyledText as="p" css={TYPOGRAPHY.pSemiBold}>
          {t('calibrate_deck')}
        </StyledText>
        <StyledText as="p">{t('calibrate_deck_description')}</StyledText>
      </Box>
      <ToggleButton
        label="legacy_settings"
        toggledOn={settings?.value === true}
        onClick={() => dispatch(updateSetting(robotName, id, !value))}
        id="RobotSettings_legacySettingsToggleButton"
      />
    </Flex>
  )
}
