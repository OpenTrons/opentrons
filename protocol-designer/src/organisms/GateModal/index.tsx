import { Trans, useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'
import {
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_END,
  Link as LinkComponent,
  Modal,
  PrimaryButton,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { LINK_BUTTON_STYLE } from '../../atoms'
import {
  actions as analyticsActions,
  selectors as analyticsSelectors,
} from '../../analytics'

const PRIVACY_POLICY_URL = 'https://opentrons.com/privacy-policy'
const EULA_URL = 'https://opentrons.com/eula'

export function GateModal(): JSX.Element | null {
  const { t } = useTranslation('shared')
  const { appVersion, hasOptedIn } = useSelector(
    analyticsSelectors.getHasOptedIn
  )
  const dispatch = useDispatch()

  if (appVersion == null || hasOptedIn == null) {
    return (
      <Modal
        childrenPadding={SPACING.spacing24}
        hasHeader={false}
        position="bottomRight"
        showOverlay={false}
        footer={
          <Flex
            justifyContent={JUSTIFY_END}
            gridGap={SPACING.spacing8}
            padding={`0 ${SPACING.spacing24} ${SPACING.spacing24}`}
          >
            <PrimaryButton onClick={() => dispatch(analyticsActions.optIn())}>
              <StyledText desktopStyle="bodyDefaultRegular">
                {t('confirm')}
              </StyledText>
            </PrimaryButton>
          </Flex>
        }
      >
        <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('opentrons_collects_data')}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">
            <Trans
              t={t}
              i18nKey="review_our_privacy_policy"
              components={{
                link1: (
                  <LinkComponent
                    external
                    href={PRIVACY_POLICY_URL}
                    css={LINK_BUTTON_STYLE}
                    textDecoration={TYPOGRAPHY.textDecorationUnderline}
                  />
                ),
              }}
            />
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">
            <Trans
              t={t}
              i18nKey="consent_to_eula"
              components={{
                link1: (
                  <LinkComponent
                    external
                    href={EULA_URL}
                    css={LINK_BUTTON_STYLE}
                    textDecoration={TYPOGRAPHY.textDecorationUnderline}
                  />
                ),
              }}
            />
          </StyledText>
        </Flex>
      </Modal>
    )
  } else {
    return null
  }
}
