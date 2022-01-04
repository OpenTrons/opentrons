import * as React from 'react'
import { css } from 'styled-components'
import {
  Icon,
  Flex,
  Box,
  Text,
  C_MED_GRAY,
  DIRECTION_COLUMN,
  FONT_BODY_1_DARK,
  FONT_HEADER_DARK,
  FONT_SIZE_BODY_1,
  FONT_WEIGHT_SEMIBOLD,
  JUSTIFY_SPACE_BETWEEN,
  SIZE_1,
  SPACING_2,
  SPACING_3,
} from '@opentrons/components'

interface CollapsibleStepProps {
  expanded: boolean
  title: string
  description: string
  label: string
  id?: string
  toggleExpanded: () => void
  children: React.ReactNode
  rightAlignedNode: React.ReactNode
}

const EXPANDED_STYLE = css`
  transition: max-height 300ms ease-in, visibility 400ms ease;
  visibility: visible;
  max-height: 100vh;
  overflow: hidden;
`
const COLLAPSED_STYLE = css`
  transition: max-height 500ms ease-out;
  visibility: hidden;
  max-height: 0vh;
  overflow: hidden;
`
export function CollapsibleStep({
  expanded,
  title,
  description,
  label,
  toggleExpanded,
  children,
  rightAlignedNode,
}: CollapsibleStepProps): JSX.Element {
  return (
    <Flex flexDirection={DIRECTION_COLUMN} paddingX={SPACING_3}>
      <Flex justifyContent={JUSTIFY_SPACE_BETWEEN} onClick={toggleExpanded}>
        <Flex flexDirection={DIRECTION_COLUMN}>
          <Text
            as="h6"
            color={C_MED_GRAY}
            fontWeight={FONT_WEIGHT_SEMIBOLD}
            fontSize={FONT_SIZE_BODY_1}
            id={`CollapsibleStep_${label}`}
          >
            {label}
          </Text>
          <Text
            as="h5"
            css={FONT_HEADER_DARK}
            marginTop={SPACING_2}
            id={`CollapsibleStep_${title}`}
          >
            {title}
          </Text>
          <Text
            as="p"
            css={FONT_BODY_1_DARK}
            marginTop={SPACING_2}
            id={`CollapsibleStep_${description}`}
          >
            {description}
          </Text>
        </Flex>
        {rightAlignedNode != null ? rightAlignedNode : null}
        <Icon size={SIZE_1} name={expanded ? 'minus' : 'plus'} />
      </Flex>
      <Box css={expanded ? EXPANDED_STYLE : COLLAPSED_STYLE}>{children}</Box>
    </Flex>
  )
}
