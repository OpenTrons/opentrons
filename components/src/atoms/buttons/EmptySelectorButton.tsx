import * as React from 'react'
import { Flex } from '../../primitives'
import {
  BORDERS,
  COLORS,
  Icon,
  SPACING,
  StyledText,
  Btn,
  JUSTIFY_CENTER,
  JUSTIFY_START,
  ALIGN_CENTER,
  FLEX_MAX_CONTENT,
} from '../..'
import type { IconName } from '../..'

interface EmptySelectorButtonProps {
  onClick: () => void
  text: string
  textAlignment: 'left' | 'middle'
  iconName?: IconName
  size?: 'large' | 'small'
}

//  used for helix and Opentrons Ai
export function EmptySelectorButton(
  props: EmptySelectorButtonProps
): JSX.Element {
  const { onClick, text, iconName, size = 'large', textAlignment } = props
  const buttonSizing = size === 'large' ? '100%' : FLEX_MAX_CONTENT

  return (
    <Btn onClick={onClick} width={buttonSizing} height={buttonSizing}>
      <Flex
        gridGap={SPACING.spacing4}
        padding={SPACING.spacing12}
        backgroundColor={COLORS.blue30}
        borderRadius={BORDERS.borderRadius8}
        border={`2px dashed ${COLORS.blue50}`}
        width="100%"
        height="100%"
        alignItems={ALIGN_CENTER}
        data-testid="EmptySelectorButton_container"
        justifyContent={
          textAlignment === 'middle' ? JUSTIFY_CENTER : JUSTIFY_START
        }
      >
        {iconName != null ? (
          <Icon
            name={iconName}
            size="1.25rem"
            data-testid={`EmptySelectorButton_${iconName}`}
          />
        ) : null}
        <StyledText desktopStyle="bodyDefaultSemiBold">{text}</StyledText>
      </Flex>
    </Btn>
  )
}
