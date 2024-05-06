import * as React from 'react'
import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  Flex,
  Btn,
  Icon,
  JUSTIFY_CENTER,
  ALIGN_CENTER,
  SPACING,
  COLORS,
  DIRECTION_COLUMN,
  POSITION_ABSOLUTE,
  TYPOGRAPHY,
  OVERFLOW_WRAP_BREAK_WORD,
  DISPLAY_FLEX,
} from '@opentrons/components'

interface RunPausedSplashProps {
  onClick: () => void
  errorType?: string
  protocolName?: string
}

export function RunPausedSplash({
  onClick,
  errorType,
  protocolName,
}: RunPausedSplashProps): JSX.Element {
  const { t } = useTranslation('error_recovery')

  let subText: string | null
  switch (errorType) {
    default:
      subText = protocolName ?? null
  }

  return (
    <Btn
      display={DISPLAY_FLEX}
      height="100vh"
      width="100%"
      justifyContent={JUSTIFY_CENTER}
      alignItems={ALIGN_CENTER}
      position={POSITION_ABSOLUTE}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing40}
      padding={SPACING.spacing120}
      backgroundColor={COLORS.grey50}
      onClick={onClick}
    >
      <SplashFrame>
        <Flex gridGap={SPACING.spacing32} alignItems={ALIGN_CENTER}>
          <Icon name="ot-alert" size="4.5rem" color={COLORS.white} />
          <SplashHeader>{t('run_paused')}</SplashHeader>
        </Flex>
        <Flex width="49rem" justifyContent={JUSTIFY_CENTER}>
          <SplashBody>{subText}</SplashBody>
        </Flex>
      </SplashFrame>
    </Btn>
  )
}

const SplashHeader = styled.h1`
  font-weight: ${TYPOGRAPHY.fontWeightBold};
  text-align: ${TYPOGRAPHY.textAlignLeft};
  font-size: ${TYPOGRAPHY.fontSize80};
  line-height: ${TYPOGRAPHY.lineHeight96};
  color: ${COLORS.white};
`
const SplashBody = styled.h4`
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
  overflow-wrap: ${OVERFLOW_WRAP_BREAK_WORD};
  font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
  text-align: ${TYPOGRAPHY.textAlignCenter};
  text-transform: ${TYPOGRAPHY.textTransformCapitalize};
  font-size: ${TYPOGRAPHY.fontSize32};
  line-height: ${TYPOGRAPHY.lineHeight42};
  color: ${COLORS.white};
`

const SplashFrame = styled(Flex)`
  width: 100%;
  height: 100%;
  flex-direction: ${DIRECTION_COLUMN};
  justify-content: ${JUSTIFY_CENTER};
  align-items: ${ALIGN_CENTER};
  grid-gap: ${SPACING.spacing40};
`
