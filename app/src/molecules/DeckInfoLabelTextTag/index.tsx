import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  DISPLAY_GRID,
  Flex,
  FLEX_MAX_CONTENT,
  JUSTIFY_END,
  JUSTIFY_FLEX_START,
  RESPONSIVENESS,
  SPACING,
  StyledText,
} from '@opentrons/components'

import type { ReactNode } from 'react'

const MAX_SUPPORTED_LABELS = 3

export interface DeckInfoLabelTextTagProps {
  /* If more than MAX_SUPPORTED_LABELS labels are provided, only the first MAX_SUPPORTED_LABELS are rendered. */
  colOneDeckInfoLabels: JSX.Element[]
  colTwoText: ReactNode
  /* Should always be a Tag. */
  colThreeTag: JSX.Element
}

export function DeckInfoLabelTextTag({
  colOneDeckInfoLabels,
  colTwoText,
  colThreeTag,
}: DeckInfoLabelTextTagProps): JSX.Element {
  return (
    <Flex css={CONTAINER_STYLE}>
      <Flex css={LABEL_CONTAINER_STYLE}>
        {colOneDeckInfoLabels
          .slice(0, MAX_SUPPORTED_LABELS)
          .map(label => label)}
      </Flex>
      <StyledText
        css={TEXT_STLYE}
        oddStyle="bodyTextRegular"
        desktopStyle="bodyDefaultRegular"
      >
        {colTwoText}
      </StyledText>
      <Flex css={TAG_CONTAINER_STYLE}>{colThreeTag}</Flex>
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  border-radius: ${BORDERS.borderRadius12};
  padding: ${SPACING.spacing12};
  width: 100%;
  display: ${DISPLAY_GRID};
  grid-template-columns: 120px 1fr ${FLEX_MAX_CONTENT};
  gap: ${SPACING.spacing40};
  align-items: ${ALIGN_CENTER};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    grid-template-columns: 1fr 1fr 1fr;
  }

  @media (max-width: 450px) {
    grid-template-columns: 1fr;
    gap: ${SPACING.spacing12};
    min-width: 0;
  }
`

const LABEL_CONTAINER_STYLE = css`
  gap: ${SPACING.spacing4};
`

const TAG_CONTAINER_STYLE = css`
  justify-self: ${JUSTIFY_END};

  @media (max-width: 450px) {
    justify-self: ${JUSTIFY_FLEX_START};
  }
`

const TEXT_STLYE = css`
  -webkit-line-clamp: 3;
`
