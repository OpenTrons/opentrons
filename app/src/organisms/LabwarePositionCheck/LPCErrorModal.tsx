import styled from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  ALIGN_FLEX_END,
  BORDERS,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  PrimaryButton,
  RESPONSIVENESS,
  SPACING,
  LegacyStyledText,
  TEXT_ALIGN_CENTER,
  TEXT_TRANSFORM_CAPITALIZE,
  TYPOGRAPHY,
} from '@opentrons/components'

import { i18n } from '/app/i18n'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'

const SUPPORT_EMAIL = 'support@opentrons.com'

export function LPCErrorModal(props: LPCWizardContentProps): JSX.Element {
  const { t } = useTranslation(['labware_position_check', 'shared', 'branded'])
  const { errorMessage, headerCommands } = props.commandUtils

  return (
    <LPCContentContainer
      {...props}
      header={t('labware_position_check_title')}
      onClickButton={headerCommands.handleCloseWithoutHome}
      buttonText={t('exit')}
    >
      <ModalContainer
        padding={SPACING.spacing32}
        flexDirection={DIRECTION_COLUMN}
        alignItems={ALIGN_CENTER}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        gridGap={SPACING.spacing16}
      >
        <Icon
          name="ot-alert"
          size="2.5rem"
          color={COLORS.red50}
          aria-label="alert"
        />
        <ErrorHeader>
          {i18n.format(t('shared:something_went_wrong'), 'sentenceCase')}
        </ErrorHeader>
        <ContentWrapper>
          <LegacyStyledText
            as="p"
            fontWeight={TYPOGRAPHY.fontWeightSemiBold}
            textAlign={TEXT_ALIGN_CENTER}
          >
            {t('remove_probe_before_exit')}
          </LegacyStyledText>
          <LegacyStyledText as="p" textAlign={TEXT_ALIGN_CENTER}>
            {t('branded:help_us_improve_send_error_report', {
              support_email: SUPPORT_EMAIL,
            })}
          </LegacyStyledText>
        </ContentWrapper>
        <ErrorTextArea readOnly value={errorMessage ?? ''} spellCheck={false} />
        <PrimaryButton
          textTransform={TEXT_TRANSFORM_CAPITALIZE}
          alignSelf={ALIGN_FLEX_END}
          onClick={headerCommands.handleCloseWithoutHome}
        >
          {t('shared:exit')}
        </PrimaryButton>
      </ModalContainer>
    </LPCContentContainer>
  )
}

const ModalContainer = styled(Flex)`
  width: 100%;
  box-sizing: border-box;
`

const ContentWrapper = styled.div`
  width: 100%;
  padding: 0 ${SPACING.spacing16};
  box-sizing: border-box;

  p {
    margin: ${SPACING.spacing8} 0;
    line-height: 1.5;
  }
`

const ErrorHeader = styled.h1`
  text-align: ${TEXT_ALIGN_CENTER};
  ${TYPOGRAPHY.h1Default}
  width: 100%;
  padding: 0 ${SPACING.spacing16};
  box-sizing: border-box;
  word-wrap: break-word;
  overflow-wrap: break-word;

  @media ${RESPONSIVENESS.touchscreenMediaQuerySpecs} {
    ${TYPOGRAPHY.level4HeaderSemiBold}
  }
`

const ErrorTextArea = styled.textarea`
  min-height: 6rem;
  width: 100%;
  background-color: #f8f8f8;
  border: ${BORDERS.lineBorder};
  border-radius: ${BORDERS.borderRadius4};
  padding: ${SPACING.spacing8};
  margin: ${SPACING.spacing16} 0;
  font-size: ${TYPOGRAPHY.fontSizeCaption};
  font-family: monospace;
  resize: none;
  box-sizing: border-box;
`
