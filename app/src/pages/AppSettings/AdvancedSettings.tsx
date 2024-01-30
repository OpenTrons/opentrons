import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'

import {
  ALIGN_CENTER,
  Box,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  SPACING_AUTO,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'
import * as CustomLabware from '../../redux/custom-labware'
import {
  useTrackEvent,
  ANALYTICS_CHANGE_CUSTOM_LABWARE_SOURCE_FOLDER,
} from '../../redux/analytics'
import { Divider } from '../../atoms/structure'
import { TertiaryButton } from '../../atoms/buttons'
import { StyledText } from '../../atoms/text'
import {
  ClearUnavailableRobots,
  EnableDevTools,
  OT2AdvancedSettings,
  OverridePathToPython,
  PreventRobotCaching,
  ShowHeaterShakerAttachmentModal,
  ShowLabwareOffsetSnippets,
  U2EInformation,
  UpdatedChannel,
} from '../../organisms/AdvancedSettings'

import type { Dispatch } from '../../redux/types'

export function AdvancedSettings(): JSX.Element {
  const { t } = useTranslation(['app_settings', 'shared'])
  const trackEvent = useTrackEvent()
  const labwarePath = useSelector(CustomLabware.getCustomLabwareDirectory)
  const dispatch = useDispatch<Dispatch>()
  return (
    <>
      <Box paddingX={SPACING.spacing16} paddingY={SPACING.spacing24}>
        <UpdatedChannel />
        <Divider marginY={SPACING.spacing24} />
        <Flex
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          gridGap={SPACING.spacing40}
        >
          <Flex flexDirection={DIRECTION_COLUMN}>
            <StyledText
              css={TYPOGRAPHY.h3SemiBold}
              paddingBottom={SPACING.spacing8}
              id="AdvancedSettings_customLabware"
            >
              {t('additional_labware_folder_title')}
            </StyledText>
            <StyledText as="p" paddingBottom={SPACING.spacing8}>
              {t('additional_folder_description')}
            </StyledText>
            <StyledText
              as="h6"
              textTransform={TYPOGRAPHY.textTransformUppercase}
              color={COLORS.grey50}
              paddingBottom={SPACING.spacing4}
            >
              {t('additional_folder_location')}
            </StyledText>
            {labwarePath !== '' ? (
              <Link
                role="button"
                css={TYPOGRAPHY.pRegular}
                color={COLORS.black90}
                onClick={() =>
                  dispatch(CustomLabware.openCustomLabwareDirectory())
                }
                id="AdvancedSettings_sourceFolderLink"
              >
                {labwarePath}
                <Icon
                  height="0.75rem"
                  marginLeft={SPACING.spacing8}
                  name="open-in-new"
                />
              </Link>
            ) : (
              <StyledText as="p">{t('no_folder')}</StyledText>
            )}
          </Flex>
          {
            <TertiaryButton
              marginLeft={SPACING_AUTO}
              onClick={() => {
                dispatch(CustomLabware.changeCustomLabwareDirectory())
                trackEvent({
                  name: ANALYTICS_CHANGE_CUSTOM_LABWARE_SOURCE_FOLDER,
                  properties: {},
                })
              }}
              id="AdvancedSettings_changeLabwareSource"
            >
              {labwarePath !== ''
                ? t('change_folder_button')
                : t('add_folder_button')}
            </TertiaryButton>
          }
        </Flex>
        <Divider marginY={SPACING.spacing24} />
        <PreventRobotCaching />
        <Divider marginY={SPACING.spacing24} />
        <ClearUnavailableRobots />
        <Divider marginY={SPACING.spacing24} />
        <ShowHeaterShakerAttachmentModal />
        <Divider marginY={SPACING.spacing24} />
        <ShowLabwareOffsetSnippets />
        <Divider marginY={SPACING.spacing24} />
        <OverridePathToPython />
        <Divider marginY={SPACING.spacing24} />
        <EnableDevTools />
        <Divider marginY={SPACING.spacing24} />
        <OT2AdvancedSettings />
        <Divider marginY={SPACING.spacing24} />
        <U2EInformation />
      </Box>
    </>
  )
}
