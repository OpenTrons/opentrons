import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { css } from 'styled-components'

import {
  Flex,
  SPACING,
  JUSTIFY_SPACE_BETWEEN,
  StyledText,
  RESPONSIVENESS,
  COLORS,
} from '@opentrons/components'

import { selectTotalOrMissingOffsetRequiredCountForLwCopy } from '/app/redux/protocol-runs'

import type { TFunction } from 'i18next'

export interface AccordionHeaderProps {
  runId: string
  uri: string
  lwDisplayName: string
}

export function AccordionHeader({
  lwDisplayName,
  runId,
  uri,
}: AccordionHeaderProps): JSX.Element {
  const { t } = useTranslation('labware_position_check')
  const offsetCopy = useSelector(
    selectTotalOrMissingOffsetRequiredCountForLwCopy(runId, uri, t as TFunction)
  )

  return (
    <Flex css={ACCORDION_HEADER_CONTAINER_STYLE}>
      <StyledText oddStyle="bodyTextSemiBold">{lwDisplayName}</StyledText>
      <StyledText css={OFFSET_COPY_STYLE} oddStyle="bodyTextRegular">
        {offsetCopy}
      </StyledText>
    </Flex>
  )
}

const ACCORDION_HEADER_CONTAINER_STYLE = css`
  gap: ${SPACING.spacing24};
  width: 100%;
  justify-content: ${JUSTIFY_SPACE_BETWEEN};
`

const OFFSET_COPY_STYLE = css`
  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    color: ${COLORS.grey60};
  }
`
