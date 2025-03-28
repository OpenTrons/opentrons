import { css } from 'styled-components'
import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  COLORS,
  DISPLAY_FLEX,
  Flex,
  Icon,
  Link,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { LPC_HREF } from '/app/local-resources/offsets'

export function LearnAboutOffsetsLink(): JSX.Element {
  const { t } = useTranslation('protocol_setup')

  return (
    <Flex css={CONTAINER_STYLE}>
      <Link external href={LPC_HREF} css={LINK_STYLE}>
        <StyledText css={TEXT_STYLE} desktopStyle="bodyDefaultRegular">
          {t('learn_more_about_labware_offsets')}
        </StyledText>
        <Icon
          css={ICON_STYLE}
          name="open-in-new"
          aria-label="open_in_new_icon"
        />
      </Link>
    </Flex>
  )
}

const CONTAINER_STYLE = css`
  gap: ${SPACING.spacing2};
`
const LINK_STYLE = css`
  display: ${DISPLAY_FLEX};
  color: ${COLORS.black90};
  align-items: ${ALIGN_CENTER};
  gap: ${SPACING.spacing2};
`
const TEXT_STYLE = css`
  padding: ${SPACING.spacing4};
  text-decoration: underline solid;
  text-underline-offset: 3px;
`
const ICON_STYLE = css`
  height: ${SPACING.spacing10};
  width: ${SPACING.spacing10};
`
