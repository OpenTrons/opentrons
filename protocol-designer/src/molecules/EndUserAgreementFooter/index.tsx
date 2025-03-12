import { Trans, useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Link,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { LINK_BUTTON_STYLE } from '../../components/atoms'
import { getYearFromDate } from './utils'

const PRIVACY_POLICY_URL = 'https://opentrons.com/privacy-policy'
const EULA_URL = 'https://opentrons.com/eula'

export function EndUserAgreementFooter(): JSX.Element {
  const { t } = useTranslation('shared')
  return (
    <Flex
      backgroundColor={COLORS.grey10}
      padding={SPACING.spacing24}
      width="100%"
      alignItems={ALIGN_CENTER}
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
    >
      <StyledText desktopStyle="captionRegular">
        <Trans
          i18nKey="privacy_policy"
          t={t}
          components={{
            privacyPolicyLink: (
              <Link
                external
                href={PRIVACY_POLICY_URL}
                textDecoration={TYPOGRAPHY.textDecorationUnderline}
                css={LINK_BUTTON_STYLE}
              />
            ),
            EULALink: (
              <Link
                external
                href={EULA_URL}
                textDecoration={TYPOGRAPHY.textDecorationUnderline}
                css={LINK_BUTTON_STYLE}
              />
            ),
          }}
        />
      </StyledText>
      <StyledText desktopStyle="captionRegular">
        {t('copyright', { year: getYearFromDate() })}
      </StyledText>
    </Flex>
  )
}
