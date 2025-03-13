import { useTranslation } from 'react-i18next'
import { css } from 'styled-components'

import { DISPLAY_GRID, Flex, SPACING, StyledText } from '@opentrons/components'

// These headers are special-cased by design and do not follow the Design system's ListTable headers.
// The headers largely mimic the column styling of the child components rendered
// in the ListTable associated with these headers.
export function OffsetTableHeaders(): JSX.Element {
  const { t } = useTranslation('labware_position_check')

  return (
    <Flex css={LIST_HEADERS_CONTAINER_STYLE}>
      <Flex css={HEADER_COLUMN_ONE_STYLE}>
        <StyledText oddStyle="bodyTextSemiBold">
          {t('location_header')}
        </StyledText>
      </Flex>
      <Flex css={HEADER_COLUMN_TWO_STYLE}>
        <StyledText oddStyle="bodyTextSemiBold">{t('offsets')}</StyledText>
      </Flex>
    </Flex>
  )
}

const LIST_HEADERS_CONTAINER_STYLE = css`
  width: 100%;
  display: ${DISPLAY_GRID};
  grid-template-columns: 160px 1fr auto;
  gap: ${SPACING.spacing24};
  padding: 0 ${SPACING.spacing12};

  @media (max-width: 423px) {
    grid-template-columns: 1fr auto;
    grid-template-areas: 'header-labels header-tag';
  }

  @media (max-width: 360px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      'header-labels'
      'header-tag';
  }
`

const HEADER_COLUMN_ONE_STYLE = css`
  @media (max-width: 423px) {
    grid-area: header-labels;
  }
`

const HEADER_COLUMN_TWO_STYLE = css`
  @media (max-width: 423px) {
    grid-area: header-tag;
  }
`
