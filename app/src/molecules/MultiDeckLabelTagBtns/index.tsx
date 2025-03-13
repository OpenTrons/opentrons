import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_GRID,
  Flex,
  FLEX_MAX_CONTENT,
  JUSTIFY_END,
  JUSTIFY_FLEX_START,
  RESPONSIVENESS,
  SecondaryButton,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { SmallButton } from '/app/atoms/buttons'

import type { SmallButtonTypes } from '/app/atoms/buttons/SmallButton'

const MAX_SUPPORTED_LABELS = 3

export interface MultiDeckLabelTagBtn {
  buttonText: string
  onClick: () => void
  disabled?: boolean
  buttonType?: SmallButtonTypes
}

export interface MultiDeckLabelTagBtnsProps {
  /* If more than MAX_SUPPORTED_LABELS labels are provided, only the first MAX_SUPPORTED_LABELS are rendered. */
  colOneDeckInfoLabels: JSX.Element[]
  /* Should always be a Tag. */
  colTwoTag: JSX.Element
  colThreePrimaryBtn: MultiDeckLabelTagBtn
  /* Optional component. Should always be a Chip. */
  colTwoChip?: JSX.Element
  colThreeSecondaryBtn?: MultiDeckLabelTagBtn
}

export function MultiDeckLabelTagBtns({
  colOneDeckInfoLabels,
  colTwoTag,
  colTwoChip,
  colThreePrimaryBtn,
  colThreeSecondaryBtn,
}: MultiDeckLabelTagBtnsProps): JSX.Element {
  return (
    <Flex css={CONTAINER_STYLE}>
      <Flex css={LABEL_CONTAINER_STYLE}>
        {colOneDeckInfoLabels
          .slice(0, MAX_SUPPORTED_LABELS)
          .map(label => label)}
      </Flex>
      <Flex css={COMPONENT_CONTAINER_STYLE}>
        {colTwoTag}
        <Flex>{colTwoChip}</Flex>
      </Flex>
      <Flex css={BTN_CONTAINER_STLYE}>
        {colThreeSecondaryBtn && (
          <>
            <SmallButton
              css={ODD_ONLY_BUTTON}
              buttonType="tertiaryHighLight"
              {...colThreeSecondaryBtn}
            />
            <Btn css={DESKTOP_ONLY_BUTTON} {...colThreeSecondaryBtn}>
              <StyledText desktopStyle="captionSemiBold">
                {colThreeSecondaryBtn.buttonText}
              </StyledText>
            </Btn>
          </>
        )}
        <>
          <SmallButton {...colThreePrimaryBtn} css={ODD_ONLY_BUTTON} />
          <SecondaryButton {...colThreePrimaryBtn} css={DESKTOP_ONLY_BUTTON}>
            <StyledText desktopStyle="captionSemiBold">
              {colThreePrimaryBtn.buttonText}
            </StyledText>
          </SecondaryButton>
        </>
      </Flex>
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  border-radius: ${BORDERS.borderRadius12};
  padding: ${SPACING.spacing12};
  width: 100%;
  display: ${DISPLAY_GRID};
  grid-template-columns: 160px 1fr ${FLEX_MAX_CONTENT};
  gap: ${SPACING.spacing24};
  align-items: ${ALIGN_CENTER};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    border-radius: ${BORDERS.borderRadius8};
  }

  /* Collapse the Tag vertically beneath the DeckInfo labels */
  @media (max-width: 423px) {
    grid-template-columns: 1fr auto;
    grid-template-areas:
      'labels buttons'
      'tag buttons';
  }

  /* Collapse to one column */
  @media (max-width: 360px) {
    grid-template-columns: 1fr;
    grid-template-areas:
      'labels'
      'tag'
      'buttons';
  }
`

const LABEL_CONTAINER_STYLE = css`
  gap: ${SPACING.spacing4};

  @media (max-width: 687px) {
    width: ${FLEX_MAX_CONTENT};
  }

  @media (max-width: 423px) {
    grid-area: labels;
  }
`

const COMPONENT_CONTAINER_STYLE = css`
  width: ${FLEX_MAX_CONTENT};
  gap: ${SPACING.spacing8};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    gap: ${SPACING.spacing10};
  }

  @media (max-width: 687px) {
    flex-direction: ${DIRECTION_COLUMN};
  }

  @media (max-width: 423px) {
    grid-area: tag;
  }
`

const BTN_CONTAINER_STLYE = css`
  justify-content: ${JUSTIFY_END};
  gap: ${SPACING.spacing8};

  @media (max-width: 687px) {
    flex-direction: ${DIRECTION_COLUMN};
    align-items: ${ALIGN_CENTER};
  }

  @media (max-width: 423px) {
    grid-area: buttons;
  }

  @media (max-width: 360px) {
    flex-direction: ${DIRECTION_ROW};
    justify-content: ${JUSTIFY_FLEX_START};
  }
`

const ODD_ONLY_BUTTON = css`
  border-radius: ${BORDERS.borderRadiusFull};

  @media not (${RESPONSIVENESS.touchscreenMediaQuerySpecs}) {
    display: none;
  }
`

const DESKTOP_ONLY_BUTTON = css`
  border-radius: ${BORDERS.borderRadiusFull};

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    display: none;
  }
`
