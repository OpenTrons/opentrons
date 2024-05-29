import React from 'react'
import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'
import {
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { InputPrompt } from '../InputPrompt'

export function ChatFooter(): JSX.Element {
  const { t } = useTranslation('protocol_generator')

  return (
    <Flex
      bottom="0"
      width="100%"
      gridGap={SPACING.spacing24}
      flexDirection={DIRECTION_COLUMN}
      minHeight="calc(100vh-15rem)"
    >
      <InputPrompt />
      <StyledText css={DISCLAIMER_TEXT_STYLE}>{t('disclaimer')}</StyledText>
    </Flex>
  )
}

const DISCLAIMER_TEXT_STYLE = css`
  color: ${COLORS.grey55};
  font-size: ${TYPOGRAPHY.fontSize20};
  line-height: ${TYPOGRAPHY.lineHeight24};
  text-align: ${TYPOGRAPHY.textAlignCenter};
`
