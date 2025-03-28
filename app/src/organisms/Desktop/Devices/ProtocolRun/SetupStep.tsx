import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  Box,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  DISPLAY_GRID,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  NO_WRAP,
  OVERFLOW_HIDDEN,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import type { ReactNode } from 'react'

interface SetupStepProps {
  /** whether or not to show the full contents of the step */
  expanded: boolean
  /** always shown text name of the step */
  title: ReactNode
  /** always shown text that provides a one sentence explanation of the contents */
  description: string
  /* element to be shown beneath the description, if any. */
  descriptionElement: ReactNode
  /** callback that should toggle the expanded state (managed by parent) */
  toggleExpanded: () => void
  /** contents to be shown only when expanded */
  children: ReactNode
  /** element to be shown (right aligned) regardless of expanded state */
  rightElement: ReactNode
}

export function SetupStep({
  expanded,
  title,
  description,
  descriptionElement,
  toggleExpanded,
  children,
  rightElement,
}: SetupStepProps): JSX.Element {
  return (
    <Flex flexDirection={DIRECTION_COLUMN}>
      <Btn textAlign={TYPOGRAPHY.textAlignLeft}>
        <Flex
          flexDirection={DIRECTION_ROW}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
        >
          <Flex
            alignItems={ALIGN_CENTER}
            justifyContent={JUSTIFY_SPACE_BETWEEN}
            width="100%"
            onClick={toggleExpanded}
            gridGap={SPACING.spacing40}
          >
            <Flex flexDirection={DIRECTION_COLUMN} gap={SPACING.spacing4}>
              <StyledText
                color={COLORS.black90}
                desktopStyle="bodyLargeSemiBold"
                id={`CollapsibleStep_${String(title)}`}
              >
                {title}
              </StyledText>
              <StyledText
                desktopStyle="bodyDefaultRegular"
                color={COLORS.black90}
                id={`CollapsibleStep_${description}`}
              >
                {description}
              </StyledText>
              {descriptionElement}
            </Flex>
            <Flex css={RIGHT_CONTENT_CONTAINER_STYLE}>
              {rightElement}
              <Icon
                color={COLORS.black90}
                size="1.5rem"
                css={ACCORDION_STYLE}
                name={expanded ? 'minus' : 'plus'}
                margin={SPACING.spacing4}
              />
            </Flex>
          </Flex>
        </Flex>
      </Btn>
      <Box
        display={DISPLAY_GRID}
        css={expanded ? EXPANDED_STYLE : COLLAPSED_STYLE}
      >
        <Box overflow={OVERFLOW_HIDDEN}>{children}</Box>
      </Box>
    </Flex>
  )
}

const EXPANDED_STYLE = css`
  transition: grid-template-rows 300ms ease-in, visibility 400ms ease;
  grid-template-rows: 1fr;
  visibility: visible;
`
const COLLAPSED_STYLE = css`
  transition: grid-template-rows 500ms ease-out, visibility 600ms ease;
  grid-template-rows: 0fr;
  visibility: hidden;
`
const ACCORDION_STYLE = css`
  border-radius: 50%;
  &:hover {
    background: ${COLORS.grey30};
  }
  &:active {
    background: ${COLORS.grey35};
  }
`

const RIGHT_CONTENT_CONTAINER_STYLE = css`
  align-items: ${ALIGN_CENTER};
  text-wrap: ${NO_WRAP};
`
