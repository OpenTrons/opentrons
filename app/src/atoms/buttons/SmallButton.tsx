import * as React from 'react'
import { css } from 'styled-components'
import {
  TYPOGRAPHY,
  COLORS,
  SPACING,
  BORDERS,
  Btn,
  Flex,
  Icon,
  DIRECTION_ROW,
  ALIGN_CENTER,
  JUSTIFY_CENTER,
} from '@opentrons/components'
import { StyledText } from '../text'
import { ODD_FOCUS_VISIBLE } from './constants'
import type { IconName, StyleProps } from '@opentrons/components'

export type SmallButtonTypes =
  | 'alert'
  | 'primary'
  | 'secondary'
  | 'tertiaryLowLight'
  | 'tertiaryHighLight'

export type ButtonCategory = 'default' | 'rounded'

export type IconPlacement = 'startIcon' | 'endIcon'
interface SmallButtonProps extends StyleProps {
  onClick: React.MouseEventHandler
  buttonType?: SmallButtonTypes
  buttonText: React.ReactNode
  iconPlacement?: IconPlacement | null
  iconName?: IconName | null
  buttonCategory?: ButtonCategory // if not specified, it will be 'default'
  disabled?: boolean
}

export function SmallButton(props: SmallButtonProps): JSX.Element {
  const {
    buttonType = 'primary',
    buttonText,
    buttonCategory = 'default',
    disabled,
    iconPlacement,
    iconName,
    ...buttonProps
  } = props

  const SMALL_BUTTON_PROPS_BY_TYPE: Record<
    SmallButtonTypes,
    {
      defaultBackgroundColor: string
      activeBackgroundColor: string
      disabledBackgroundColor: string
      disabledColor: string
      defaultColor: string
    }
  > = {
    secondary: {
<<<<<<< HEAD
      defaultColor: LEGACY_COLORS.darkBlackEnabled,
      defaultBackgroundColor: COLORS.blue35,
      activeBackgroundColor: COLORS.blue40,
      disabledBackgroundColor: `${LEGACY_COLORS.darkBlack20}`,
      disabledColor: `${LEGACY_COLORS.darkBlack60}`,
=======
      defaultColor: COLORS.darkBlackEnabled,
      defaultBackgroundColor: COLORS.mediumBlueEnabled,
      activeBackgroundColor: COLORS.mediumBluePressed,
      disabledBackgroundColor: `${COLORS.grey35}`,
      disabledColor: `${COLORS.grey50}`,
>>>>>>> 2524ab95c98ff696e637a42d46ea6a893c63f735
    },
    alert: {
      defaultColor: COLORS.white,
      defaultBackgroundColor: COLORS.red2,
      activeBackgroundColor: COLORS.red2Pressed,
      disabledBackgroundColor: `${COLORS.grey35}`,
      disabledColor: `${COLORS.grey50}`,
    },
    primary: {
<<<<<<< HEAD
      defaultColor: LEGACY_COLORS.white,
      defaultBackgroundColor: COLORS.blue50,
      activeBackgroundColor: COLORS.blue60,
      disabledBackgroundColor: `${LEGACY_COLORS.darkBlack20}`,
      disabledColor: `${LEGACY_COLORS.darkBlack60}`,
    },
    tertiaryHighLight: {
      defaultColor: LEGACY_COLORS.darkBlackEnabled,
      defaultBackgroundColor: `${COLORS.blue50}${LEGACY_COLORS.opacity0HexCode}`,
      activeBackgroundColor: `${LEGACY_COLORS.darkBlack20}`,
      disabledBackgroundColor: `${COLORS.blue50}${LEGACY_COLORS.opacity0HexCode}`,
      disabledColor: `${LEGACY_COLORS.darkBlack60}`,
    },
    tertiaryLowLight: {
      defaultColor: `${LEGACY_COLORS.darkBlack70}`,
      defaultBackgroundColor: ` ${COLORS.blue50}${LEGACY_COLORS.opacity0HexCode}`,
      activeBackgroundColor: `${LEGACY_COLORS.darkBlack20}`,
      disabledBackgroundColor: `${COLORS.blue50}${LEGACY_COLORS.opacity0HexCode}`,
      disabledColor: `${LEGACY_COLORS.darkBlack60}`,
=======
      defaultColor: COLORS.white,
      defaultBackgroundColor: COLORS.blueEnabled,
      activeBackgroundColor: COLORS.bluePressed,
      disabledBackgroundColor: `${COLORS.grey35}`,
      disabledColor: `${COLORS.grey50}`,
    },
    tertiaryHighLight: {
      defaultColor: COLORS.darkBlackEnabled,
      defaultBackgroundColor: `${COLORS.blueEnabled}${COLORS.opacity0HexCode}`,
      activeBackgroundColor: `${COLORS.grey35}`,
      disabledBackgroundColor: `${COLORS.blueEnabled}${COLORS.opacity0HexCode}`,
      disabledColor: `${COLORS.grey50}`,
    },
    tertiaryLowLight: {
      defaultColor: `${COLORS.grey60}`,
      defaultBackgroundColor: ` ${COLORS.blueEnabled}${COLORS.opacity0HexCode}`,
      activeBackgroundColor: `${COLORS.grey35}`,
      disabledBackgroundColor: `${COLORS.blueEnabled}${COLORS.opacity0HexCode}`,
      disabledColor: `${COLORS.grey50}`,
>>>>>>> 2524ab95c98ff696e637a42d46ea6a893c63f735
    },
  }

  const SMALL_BUTTON_STYLE = css`
    color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
      .defaultBackgroundColor};
    cursor: default;
    border-radius: ${buttonCategory === 'rounded'
      ? BORDERS.borderRadiusSize5
      : BORDERS.borderRadiusSize4};
    box-shadow: none;
    ${TYPOGRAPHY.pSemiBold}

    &:focus {
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .activeBackgroundColor};
      box-shadow: none;
    }
    &:hover {
      border: none;
      box-shadow: none;
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .defaultBackgroundColor};
      color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType].defaultColor};
    }
    &:focus-visible {
      box-shadow: ${ODD_FOCUS_VISIBLE};
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .defaultBackgroundColor};
    }

    &:active {
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .activeBackgroundColor};
    }

    &:disabled {
      background-color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType]
        .disabledBackgroundColor};
      color: ${SMALL_BUTTON_PROPS_BY_TYPE[buttonType].disabledColor};
    }
  `

  return (
    <Btn
      css={SMALL_BUTTON_STYLE}
      disabled={disabled}
      padding={
        iconPlacement != null
          ? SPACING.spacing16
          : `${SPACING.spacing16} ${SPACING.spacing24}`
      }
      {...buttonProps}
    >
      <Flex
        flexDirection={DIRECTION_ROW}
        justifyContent={JUSTIFY_CENTER}
        alignItems={ALIGN_CENTER}
      >
        {iconPlacement === 'startIcon' && iconName != null ? (
          <Flex
            aria-label={
              iconName === 'ot-spinner' ? 'loading indicator' : iconName
            }
          >
            <Icon
              size="1.75rem"
              marginRight={SPACING.spacing8}
              name={iconName}
              spin={iconName === 'ot-spinner'}
            />
          </Flex>
        ) : null}

        <StyledText
          fontSize="1.375rem"
          lineHeight={TYPOGRAPHY.lineHeight28}
          fontWeight={TYPOGRAPHY.fontWeightSemiBold}
        >
          {buttonText}
        </StyledText>
        {iconPlacement === 'endIcon' && iconName != null ? (
          <Flex
            aria-label={
              iconName === 'ot-spinner' ? 'loading indicator' : iconName
            }
          >
            <Icon
              size="1.75rem"
              marginLeft={SPACING.spacing8}
              name={iconName}
              spin={iconName === 'ot-spinner'}
            />
          </Flex>
        ) : null}
      </Flex>
    </Btn>
  )
}
