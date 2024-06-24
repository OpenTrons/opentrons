import * as React from 'react'
import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Box,
  Btn,
  COLORS,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  StyledText,
  TYPOGRAPHY,
  RESPONSIVENESS,
} from '@opentrons/components'

import type { IconProps, StyleProps } from '@opentrons/components'

type InlineNotificationType = 'alert' | 'error' | 'neutral' | 'success'

export interface InlineNotificationProps extends StyleProps {
  /** name constant of the icon to display */
  type: InlineNotificationType
  /** InlineNotification contents */
  heading: string
  message?: string
  /** Optional dynamic width based on contents */
  hug?: boolean
  /** optional handler to show close button/clear alert  */
  onCloseClick?: (() => void) | React.MouseEventHandler<HTMLButtonElement>
}

const INLINE_NOTIFICATION_PROPS_BY_TYPE: Record<
  InlineNotificationType,
  { icon: IconProps; backgroundColor: string; color: string }
> = {
  alert: {
    icon: { name: 'ot-alert' },
    backgroundColor: COLORS.yellow30,
    color: COLORS.yellow60,
  },
  error: {
    icon: { name: 'ot-alert' },
    backgroundColor: COLORS.red30,
    color: COLORS.red60,
  },
  neutral: {
    icon: { name: 'information' },
    backgroundColor: COLORS.blue30,
    color: COLORS.blue60,
  },
  success: {
    icon: { name: 'ot-check' },
    backgroundColor: COLORS.green30,
    color: COLORS.green60,
  },
}

export function InlineNotification(
  props: InlineNotificationProps
): JSX.Element {
  const { heading, hug = false, onCloseClick, message, type } = props
  const fullHeading = `${heading}${message ? '. ' : ''}`
  const fullmessage = `${message}.`
  const inlineNotificationProps = INLINE_NOTIFICATION_PROPS_BY_TYPE[type]
  const iconProps = {
    ...inlineNotificationProps.icon,
    color: INLINE_NOTIFICATION_PROPS_BY_TYPE[type].color,
    size: '100%',
  }
  return (
    <Flex
      alignItems={ALIGN_CENTER}
      backgroundColor={INLINE_NOTIFICATION_PROPS_BY_TYPE[type].backgroundColor}
      borderRadius={BORDERS.borderRadius12}
      data-testid={`InlineNotification_${type}`}
      flexDirection={DIRECTION_ROW}
      gridGap={SPACING.spacing12}
      justifyContent={JUSTIFY_SPACE_BETWEEN}
      padding={`${SPACING.spacing12} ${SPACING.spacing16}`}
      width={hug ? 'max-content' : '100%'}
    >
      <Box
        css={css`
          width: ${SPACING.spacing16};
          height: ${SPACING.spacing16};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            width: 1.75rem;
            height: 1.75rem;
          }
        `}
      >
        <Icon {...iconProps} aria-label={`icon_${type}`} />
      </Box>
      <Flex flex="1" alignItems={ALIGN_CENTER}>
        <StyledText
          oddStyle="bodyTextRegular"
          desktopStyle="bodyDefaultRegular"
        >
          <span
            css={`
              font-weight: ${TYPOGRAPHY.fontWeightSemiBold};
            `}
          >
            {fullHeading}
          </span>
          {/* this break is because the desktop wants this on two lines, but also wants/
            inline text layout on ODD. Soooo here you go */}
          <br
            css={`
              @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
                display: none;
              }
            `}
          />
          {message != null && fullmessage}
        </StyledText>
      </Flex>
      {onCloseClick && (
        <Btn
          data-testid="InlineNotification_close-button"
          onClick={onCloseClick}
        >
          <Icon aria-label="close_icon" name="close" size="3rem" />
        </Btn>
      )}
    </Flex>
  )
}
