import {
  Flex,
  SPACING,
  DIRECTION_COLUMN,
  StyledText,
  RESPONSIVENESS,
} from '@opentrons/components'
import { InlineNotification } from '/app/atoms/InlineNotification'

interface NotificationProps {
  notificationHeader?: string
  notificationMessage?: string
}

export interface DescriptionContentProps extends NotificationProps {
  headline: string
  message: string | JSX.Element
}

export function DescriptionContent(
  props: DescriptionContentProps
): JSX.Element {
  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gap={SPACING.spacing24}
      css={`
        gap: ${SPACING.spacing16} @media:
          ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
          gap: ${SPACING.spacing24};
        }
      `}
    >
      <Flex
        flexDirection={DIRECTION_COLUMN}
        css={`
          gap: ${SPACING.spacing16};
          @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
            gap: ${SPACING.spacing8};
          }
        `}
      >
        <StyledText
          oddStyle="level4HeaderSemiBold"
          desktopStyle="headingSmallBold"
        >
          {props.headline}
        </StyledText>
        {typeof props.message === 'string' ? (
          <StyledText
            oddStyle="bodyTextRegular"
            desktopStyle="bodyDefaultRegular"
          >
            {props.message}
          </StyledText>
        ) : (
          props.message
        )}
      </Flex>
      <NotificationIfSpecified {...props} />
    </Flex>
  )
}

function NotificationIfSpecified({
  notificationHeader,
  notificationMessage,
}: NotificationProps): JSX.Element | null {
  return (notificationHeader == null || notificationHeader.length === 0) &&
    (notificationMessage == null || notificationMessage.length === 0) ? null : (
    <InlineNotification
      type="alert"
      heading={notificationHeader as string}
      message={notificationMessage}
    />
  )
}
