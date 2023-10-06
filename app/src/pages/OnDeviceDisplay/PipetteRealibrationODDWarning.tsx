import * as React from 'react'
import { useTranslation, Trans } from 'react-i18next'
import {
  Flex,
  Icon,
  Btn,
  SPACING,
  COLORS,
  JUSTIFY_SPACE_BETWEEN,
  ALIGN_CENTER,
  BORDERS,
  JUSTIFY_FLEX_START,
} from '@opentrons/components'
import { StyledText } from '../../atoms/text'

export const PipetteRecalibrationODDWarning = (): JSX.Element | null => {
  const { t } = useTranslation('instruments_dashboard')
  const [showBanner, setShowBanner] = React.useState<boolean>(true)
  if (!showBanner) return null

  return (
    <Flex
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
      borderRadius={BORDERS.borderRadiusSize3}
      backgroundColor={COLORS.yellow3}
      padding={`${SPACING.spacing12} ${SPACING.spacing16}`}
      height="5.76rem"
      width="60rem"
    >
      <Flex justifyContent={JUSTIFY_FLEX_START}>
        <Icon
          name="alert-circle"
          color={COLORS.yellow2}
          width="45px"
          marginRight={SPACING.spacing12}
        />
        <StyledText as="p">
          <Trans
            t={t}
            i18nKey="pipette_calibrations_differ"
            components={{ bold: <strong /> }}
          />
        </StyledText>
      </Flex>
      <Btn onClick={() => setShowBanner(false)}>
        <Icon
          width={SPACING.spacing32}
          height={SPACING.spacing32}
          name="close"
          aria-label="close_icon"
        />
      </Btn>
    </Flex>
  )
}
