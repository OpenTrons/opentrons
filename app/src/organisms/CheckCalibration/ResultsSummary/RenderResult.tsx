import * as React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Flex,
  ALIGN_CENTER,
  Icon,
  COLORS,
  SPACING,
  SIZE_1,
} from '@opentrons/components'
import { StyledText } from '../../../atoms/text'

interface RenderResultProps {
  isBadCal: boolean
}

export const RenderResult = ({ isBadCal }: RenderResultProps): JSX.Element => {
  const { t } = useTranslation('robot_calibration')

  return (
    <Flex alignItems={ALIGN_CENTER}>
      <StyledText
        color={isBadCal ? COLORS.warningText : COLORS.successText}
        marginRight={SPACING.spacing8}
      >
        {isBadCal ? t('recalibration_recommended') : t('good_calibration')}
      </StyledText>
      <Icon
        name={isBadCal ? 'alert-circle' : 'check-circle'}
        size={SIZE_1}
        color={isBadCal ? COLORS.warningEnabled : COLORS.successEnabled}
        marginRight="0.75rem"
        data-testid="RenderResult_icon"
      />
    </Flex>
  )
}
