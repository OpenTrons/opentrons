import { useTranslation } from 'react-i18next'

import {
  ALIGN_CENTER,
  Btn,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  Link as LinkComponent,
  ListItem,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { LINK_BUTTON_STYLE } from '../../atoms'
import { DOC_URL } from '../../organisms'

import type { Dispatch, SetStateAction } from 'react'

interface AppInfoProps {
  setShowAnnouncementModal: Dispatch<SetStateAction<boolean>>
}

export function AppInfo({
  setShowAnnouncementModal,
}: AppInfoProps): JSX.Element {
  const { t } = useTranslation('shared')
  const pdVersion = process.env.OT_PD_VERSION

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
      height="100%"
    >
      <Flex width="100%" height="100%" justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <StyledText desktopStyle="bodyLargeSemiBold">
          {t('app_info')}
        </StyledText>
      </Flex>
      <ListItem
        padding={SPACING.spacing16}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        type="default"
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {t('pd_version')}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">{pdVersion}</StyledText>
        </Flex>
        <Flex gridGap={SPACING.spacing16} alignItems={ALIGN_CENTER}>
          <LinkComponent
            css={LINK_BUTTON_STYLE}
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
            href={DOC_URL}
            external
            padding={SPACING.spacing4}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('software_manual')}
            </StyledText>
          </LinkComponent>

          <Btn
            css={LINK_BUTTON_STYLE}
            textDecoration={TYPOGRAPHY.textDecorationUnderline}
            onClick={() => {
              setShowAnnouncementModal(true)
            }}
            data-testid="AnnouncementModal_viewReleaseNotesButton"
            padding={SPACING.spacing4}
          >
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('release_notes')}
            </StyledText>
          </Btn>
        </Flex>
      </ListItem>
    </Flex>
  )
}
