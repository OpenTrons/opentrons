import * as React from 'react'
import { css } from 'styled-components'
import {
  BORDERS,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DISPLAY_FLEX,
  Icon,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'
import { ODD_FOCUS_VISIBLE } from './constants'
import type { IconName, StyleProps } from '@opentrons/components'

type LargeButtonTypes = 'primary' | 'secondary' | 'alert'
interface LargeButtonProps extends StyleProps {
  onClick: () => void
  buttonType?: LargeButtonTypes
  buttonText: React.ReactNode
  iconName?: IconName
  subtext?: string
  disabled?: boolean
}

export function LargeButton(props: LargeButtonProps): JSX.Element {
  const {
    buttonType = 'primary',
    buttonText,
    iconName,
    subtext,
    disabled = false,
    ...buttonProps
  } = props

  const LARGE_BUTTON_PROPS_BY_TYPE: Record<
    LargeButtonTypes,
    {
      defaultBackgroundColor: string
      activeBackgroundColor: string
      defaultColor: string
      iconColor: string
    }
  > = {
    secondary: {
      defaultColor: COLORS.black90,
      defaultBackgroundColor: COLORS.blue35,
      activeBackgroundColor: COLORS.blue40,
      iconColor: COLORS.blue50,
    },
    alert: {
      defaultColor: COLORS.red60,
      defaultBackgroundColor: COLORS.red35,
      activeBackgroundColor: COLORS.red40,
      iconColor: COLORS.red60,
    },
    primary: {
      defaultColor: COLORS.white,
      defaultBackgroundColor: COLORS.blue50,
      activeBackgroundColor: COLORS.blue60,
      iconColor: COLORS.white,
    },
  }

  const LARGE_BUTTON_STYLE = css`
    text-align: ${TYPOGRAPHY.textAlignLeft};
    color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
      .defaultBackgroundColor};
    cursor: default;
    border-radius: ${BORDERS.borderRadius16};
    box-shadow: none;
    padding: ${SPACING.spacing24};
    line-height: ${TYPOGRAPHY.lineHeight20};
    ${TYPOGRAPHY.pSemiBold}

    &:focus {
      background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
        .activeBackgroundColor};
      box-shadow: none;
    }
    &:hover {
      border: none;
      box-shadow: none;
      background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
        .defaultBackgroundColor};
      color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    }
    &:focus-visible {
      box-shadow: ${ODD_FOCUS_VISIBLE};
      background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
        .defaultBackgroundColor};
    }
    &:active {
      background-color: ${LARGE_BUTTON_PROPS_BY_TYPE[buttonType]
        .activeBackgroundColor};
    }

    &:disabled {
      background-color: ${COLORS.grey35};
      color: ${COLORS.grey50};
    }
  `
  return (
    <Btn
      display={DISPLAY_FLEX}
      css={LARGE_BUTTON_STYLE}
      flexDirection={DIRECTION_COLUMN}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      disabled={disabled}
      {...buttonProps}
    >
      <Flex flexDirection={DIRECTION_COLUMN}>
        <StyledText css={TYPOGRAPHY.level3HeaderSemiBold}>
          {buttonText}
        </StyledText>
        {subtext ? (
          <StyledText css={TYPOGRAPHY.level3HeaderRegular}>
            {subtext}
          </StyledText>
        ) : null}
      </Flex>
      {iconName ? (
        <Icon
          name={iconName}
          aria-label={`${iconName} icon`}
          color={
            disabled
              ? COLORS.grey50
              : LARGE_BUTTON_PROPS_BY_TYPE[buttonType].iconColor
          }
          size="5rem"
        />
      ) : null}
    </Btn>
  )
}
