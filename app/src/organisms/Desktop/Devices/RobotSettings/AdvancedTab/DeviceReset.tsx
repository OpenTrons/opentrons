import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  Box,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING_AUTO,
  SPACING,
  LegacyStyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { TertiaryButton } from '/app/atoms/buttons'

import type { MouseEventHandler } from 'react'

interface DeviceResetProps {
  updateIsExpanded: (
    isExpanded: boolean,
    type: 'deviceReset' | 'renameRobot'
  ) => void
  isRobotBusy: boolean
}

export function DeviceReset({
  updateIsExpanded,
  isRobotBusy,
}: DeviceResetProps): JSX.Element {
  const { t } = useTranslation('device_settings')

  const handleClick: MouseEventHandler<HTMLButtonElement> = () => {
    if (!isRobotBusy) {
      updateIsExpanded(true, 'deviceReset')
    }
  }

  return (
    <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
      <Box width="70%">
        <LegacyStyledText
          css={TYPOGRAPHY.pSemiBold}
          marginBottom={SPACING.spacing4}
          id="AdvancedSettings_deviceReset"
        >
          {t('device_reset')}
        </LegacyStyledText>
        <LegacyStyledText as="p">
          {t('device_reset_description')}
        </LegacyStyledText>
      </Box>
      <TertiaryButton
        marginLeft={SPACING_AUTO}
        onClick={handleClick}
        id="RobotSettings_DeviceResetChooseButton"
        disabled={isRobotBusy}
      >
        {t('choose_reset_settings')}
      </TertiaryButton>
    </Flex>
  )
}
