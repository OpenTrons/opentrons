import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  BORDERS,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_END,
  LegacyStyledText,
  NO_WRAP,
  SPACING,
  TEXT_ALIGN_RIGHT,
  truncateString,
  TYPOGRAPHY,
} from '@opentrons/components'
import { useToaster } from '../../../ToasterOven'

const CSV_FILE_MAX_LENGTH = 18 // truncated text + three dots

export type ProtocolSetupStepStatus =
  | 'ready'
  | 'not ready'
  | 'general'
  | 'inform'
export interface ProtocolSetupStepProps {
  onClickSetupStep: () => void
  status: ProtocolSetupStepStatus
  title: string
  // first line of detail text
  detail?: string | null
  // clip detail text overflow with ellipsis
  clipDetail?: boolean
  // second line of detail text
  subDetail?: string | null
  // disallow click handler, disabled styling
  disabled?: boolean
  // disallow click handler, don't show CTA icons, allow styling
  interactionDisabled?: boolean
  // display the reason the setup step is disabled
  disabledReason?: string | null
  //  optional description
  description?: string | null
  //  optional removal of the left icon
  hasLeftIcon?: boolean
  //  optional removal of the right icon
  hasRightIcon?: boolean
  //  optional enlarge the font size
  fontSize?: string
}

export function ProtocolSetupStep({
  onClickSetupStep,
  status,
  title,
  detail,
  subDetail,
  disabled = false,
  clipDetail = false,
  interactionDisabled = false,
  disabledReason,
  description,
  hasRightIcon = true,
  hasLeftIcon = true,
  fontSize = 'p',
}: ProtocolSetupStepProps): JSX.Element {
  const isInteractionDisabled = interactionDisabled || disabled
  const backgroundColorByStepStatus = {
    ready: COLORS.green35,
    'not ready': COLORS.yellow35,
    general: COLORS.grey35,
    inform: COLORS.grey35,
  }
  const { makeSnackbar } = useToaster()

  const makeDisabledReasonSnackbar = (): void => {
    if (disabledReason != null) {
      makeSnackbar(disabledReason)
    }
  }

  let backgroundColor: string
  if (!disabled) {
    switch (status) {
      case 'general':
        backgroundColor = COLORS.blue35
        break
      case 'ready':
        backgroundColor = COLORS.green40
        break
      case 'inform':
        backgroundColor = COLORS.grey50
        break
      default:
        backgroundColor = COLORS.yellow40
    }
  } else backgroundColor = ''

  const PUSHED_STATE_STYLE = css`
    &:active {
      background-color: ${backgroundColor};
    }
  `

  const isToggle = detail === 'On' || detail === 'Off'

  return (
    <Btn
      onClick={() => {
        !isInteractionDisabled
          ? onClickSetupStep()
          : makeDisabledReasonSnackbar()
      }}
      width="100%"
      data-testid={`SetupButton_${title}`}
    >
      <Flex
        alignItems={ALIGN_CENTER}
        backgroundColor={
          disabled ? COLORS.grey35 : backgroundColorByStepStatus[status]
        }
        borderRadius={BORDERS.borderRadius16}
        gridGap={SPACING.spacing16}
        padding={`${SPACING.spacing20} ${SPACING.spacing24}`}
        css={PUSHED_STATE_STYLE}
      >
        {status !== 'general' &&
        !disabled &&
        status !== 'inform' &&
        hasLeftIcon ? (
          <Icon
            color={status === 'ready' ? COLORS.green60 : COLORS.yellow60}
            size="2rem"
            name={status === 'ready' ? 'ot-check' : 'ot-alert'}
          />
        ) : null}
        <Flex
          flexDirection={DIRECTION_COLUMN}
          textAlign={TYPOGRAPHY.textAlignLeft}
        >
          <LegacyStyledText
            as="h4"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            color={disabled ? COLORS.grey50 : COLORS.black90}
          >
            {title}
          </LegacyStyledText>
          {description != null ? (
            <LegacyStyledText
              as="h4"
              color={disabled ? COLORS.grey50 : COLORS.grey60}
              maxWidth="35rem"
            >
              {description}
            </LegacyStyledText>
          ) : null}
        </Flex>
        <Flex
          flex="1"
          justifyContent={JUSTIFY_END}
          padding={
            isToggle ? `${SPACING.spacing12} ${SPACING.spacing10}` : 'undefined'
          }
        >
          <LegacyStyledText
            as={fontSize}
            textAlign={TEXT_ALIGN_RIGHT}
            color={interactionDisabled ? COLORS.grey50 : COLORS.black90}
            maxWidth="20rem"
            css={clipDetail ? CLIPPED_TEXT_STYLE : undefined}
          >
            {title === 'CSV File' && detail != null
              ? truncateString(detail, CSV_FILE_MAX_LENGTH)
              : detail}
            {subDetail != null && detail != null ? <br /> : null}
            {subDetail}
          </LegacyStyledText>
        </Flex>
        {interactionDisabled || !hasRightIcon ? null : (
          <Icon
            marginLeft={SPACING.spacing8}
            name="more"
            size="3rem"
            // Required to prevent inconsistent component height.
            style={{ backgroundColor: 'initial' }}
          />
        )}
      </Flex>
    </Btn>
  )
}

const CLIPPED_TEXT_STYLE = css`
  white-space: ${NO_WRAP};
  overflow: hidden;
  text-overflow: ellipsis;
`
