import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  PrimaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { Slideout } from '../../atoms/Slideout'

interface AboutGripperSlideoutProps {
  serialNumber: string
  firmwareVersion?: string
  onCloseClick: () => unknown
  isExpanded: boolean
}

export const AboutGripperSlideout = (
  props: AboutGripperSlideoutProps
): JSX.Element | null => {
  const { serialNumber, firmwareVersion, isExpanded, onCloseClick } = props
  const { i18n, t } = useTranslation(['device_details', 'shared'])

  return (
    <Slideout
      title={t('about_flex_gripper')}
      onCloseClick={onCloseClick}
      isExpanded={isExpanded}
      footer={
        <PrimaryButton
          onClick={onCloseClick}
          width="100%"
          data-testid="AboutPipette_slideout_close"
        >
          {i18n.format(t('shared:close'), 'capitalize')}
        </PrimaryButton>
      }
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        {firmwareVersion != null && (
          <>
            <StyledText
              as="h6"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              color={COLORS.grey60}
            >
              {i18n.format(t('current_version'), 'upperCase')}
            </StyledText>
            <StyledText
              as="p"
              paddingTop={SPACING.spacing4}
              paddingBottom={SPACING.spacing16}
            >
              {firmwareVersion}
            </StyledText>
          </>
        )}
        <StyledText
          as="h6"
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
          color={COLORS.grey60}
        >
          {i18n.format(t('serial_number'), 'upperCase')}
        </StyledText>
        <StyledText as="p" paddingTop={SPACING.spacing4}>
          {serialNumber}
        </StyledText>
      </Flex>
    </Slideout>
  )
}
