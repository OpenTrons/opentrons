import * as React from 'react'
import { css } from 'styled-components'

import {
  Flex,
  Icon,
  Link,
  ALIGN_CENTER,
  BORDER_STYLE_SOLID,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { StyledText } from '../text'

import type { IconName, IconProps, StyleProps } from '@opentrons/components'

export const SUCCESS_TOAST: 'success' = 'success'
export const WARNING_TOAST: 'warning' = 'warning'
export const ERROR_TOAST: 'error' = 'error'
export const INFO_TOAST: 'info' = 'info'

export type ToastType =
  | typeof SUCCESS_TOAST
  | typeof WARNING_TOAST
  | typeof ERROR_TOAST
  | typeof INFO_TOAST

export interface ToastProps extends StyleProps {
  id: string
  message: string
  type: ToastType
  icon?: IconProps
  closeButton?: boolean
  onClose?: () => void
  disableTimeout?: boolean
  duration?: number
  heading?: string
}

const TOAST_ANIMATION_DURATION = 500

const EXPANDED_STYLE = css`
  animation-duration: ${TOAST_ANIMATION_DURATION}ms;
  animation-name: slidein;
  overflow: hidden;

  @keyframes slidein {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0%);
    }
  }
`

// TODO(bh: 2022-12-1): implement css for toast removal -
// a bit complicated because removal removes the element from the DOM immediately
// a library like react-transition-group is a possible solution

const toastStyleByType: {
  [k in ToastType]: {
    iconName: IconName
    color: string
    backgroundColor: string
  }
} = {
  [ERROR_TOAST]: {
    iconName: 'alert-circle',
    color: COLORS.errorEnabled,
    backgroundColor: COLORS.errorBackgroundLight,
  },
  [WARNING_TOAST]: {
    iconName: 'alert-circle',
    color: COLORS.warningEnabled,
    backgroundColor: COLORS.warningBackgroundLight,
  },
  [SUCCESS_TOAST]: {
    iconName: 'check-circle',
    color: COLORS.successEnabled,
    backgroundColor: COLORS.successBackgroundLight,
  },
  [INFO_TOAST]: {
    iconName: 'information',
    color: COLORS.darkGreyEnabled,
    backgroundColor: COLORS.darkGreyDisabled,
  },
}

export function Toast(props: ToastProps): JSX.Element {
  const {
    message,
    type,
    icon,
    closeButton,
    onClose,
    disableTimeout = false,
    duration = 8000,
    heading,
    ...styleProps
  } = props

  if (!disableTimeout) {
    setTimeout(() => {
      onClose?.()
    }, duration)
  }

  return (
    // maxWidth is based on default app size ratio, minWidth of 384px
    <Flex
      css={EXPANDED_STYLE}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      alignItems={ALIGN_CENTER}
      borderRadius={BORDERS.radiusSoftCorners}
      borderColor={toastStyleByType[type].color}
      borderWidth={SPACING.spacingXXS}
      border={BORDER_STYLE_SOLID}
      backgroundColor={toastStyleByType[type].backgroundColor}
      // adjust padding when heading is present and creates extra column
      padding={`${heading != null ? SPACING.spacing2 : SPACING.spacing3} ${
        SPACING.spacing3
      } ${heading != null ? SPACING.spacing2 : SPACING.spacing3} 0.75rem`}
      data-testid={`Toast_${type}`}
      maxWidth="88%"
      minWidth="24rem"
      {...styleProps}
    >
      <Flex flexDirection={DIRECTION_ROW} overflow="hidden" width="100%">
        <Icon
          name={icon?.name ?? toastStyleByType[type].iconName}
          color={toastStyleByType[type].color}
          width={SPACING.spacing4}
          marginRight={SPACING.spacing3}
          spin={icon?.spin != null ? icon.spin : false}
          aria-label={`icon_${type}`}
        />
        <Flex flexDirection={DIRECTION_COLUMN} overflow="hidden" width="100%">
          {heading != null ? (
            <StyledText
              as="p"
              fontWeight={TYPOGRAPHY.fontWeightSemiBold}
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {heading}
            </StyledText>
          ) : null}
          <StyledText as="p">{message}</StyledText>
        </Flex>
      </Flex>
      {closeButton === true && (
        <Link onClick={onClose} role="button" height={SPACING.spacing5}>
          <Icon
            name="close"
            width={SPACING.spacing5}
            marginLeft={SPACING.spacing3}
          />
        </Link>
      )}
    </Flex>
  )
}
