import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { useSelector, useDispatch } from 'react-redux'

import {
  AlertPrimaryButton,
  ALIGN_CENTER,
  Box,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  DIRECTION_ROW,
  Flex,
  Icon,
  JUSTIFY_FLEX_END,
  JUSTIFY_SPACE_BETWEEN,
  Link,
  SPACING_AUTO,
  SPACING,
  TYPOGRAPHY,
  useConditionalConfirm,
} from '@opentrons/components'

import * as Config from '../../redux/config'
import * as CustomLabware from '../../redux/custom-labware'
import {
  clearDiscoveryCache,
  getReachableRobots,
  getUnreachableRobots,
} from '../../redux/discovery'
import { LegacyModal } from '../../molecules/LegacyModal'
import { Portal } from '../../App/portal'
import { SelectOption } from '../../atoms/SelectField/Select'
import { SelectField } from '../../atoms/SelectField'
import { ERROR_TOAST, SUCCESS_TOAST } from '../../atoms/Toast'
import {
  useTrackEvent,
  ANALYTICS_CHANGE_CUSTOM_LABWARE_SOURCE_FOLDER,
} from '../../redux/analytics'
import { Divider } from '../../atoms/structure'
import { TertiaryButton, ToggleButton } from '../../atoms/buttons'
import { StyledText } from '../../atoms/text'
import { useToaster } from '../../organisms/ToasterOven'
import {
  EnableDevTools,
  OT2AdvancedSettings,
  OverridePathToPython,
  PreventRobotCaching,
  ShowHeaterShakerAttachmentModal,
  U2EInformation,
} from '../../organisms/AdvancedSettings'

import type { Dispatch, State } from '../../redux/types'

export function AdvancedSettings(): JSX.Element {
  const { t } = useTranslation(['app_settings', 'shared'])
  const trackEvent = useTrackEvent()
  const channel = useSelector(Config.getUpdateChannel)
  const channelOptions: SelectOption[] = useSelector(
    Config.getUpdateChannelOptions
  )
  const labwarePath = useSelector(CustomLabware.getCustomLabwareDirectory)
  const isLabwareOffsetCodeSnippetsOn = useSelector(
    Config.getIsLabwareOffsetCodeSnippetsOn
  )
  const dispatch = useDispatch<Dispatch>()
  const { makeToast } = useToaster()
  const reachableRobots = useSelector((state: State) =>
    getReachableRobots(state)
  )
  const unreachableRobots = useSelector((state: State) =>
    getUnreachableRobots(state)
  )
  const recentlySeenRobots = reachableRobots.filter(
    robot => robot.healthStatus !== 'ok'
  )
  const isUnavailableRobots =
    unreachableRobots.length > 0 || recentlySeenRobots.length > 0

  const handleDeleteUnavailRobots = (): void => {
    if (isUnavailableRobots) {
      dispatch(clearDiscoveryCache())
      makeToast(t('successfully_deleted_unavail_robots'), SUCCESS_TOAST)
    } else {
      makeToast(t('no_unavail_robots_to_clear'), ERROR_TOAST)
    }
  }

  const {
    confirm: confirmDeleteUnavailRobots,
    showConfirmation: showConfirmDeleteUnavailRobots,
    cancel: cancelExit,
  } = useConditionalConfirm(handleDeleteUnavailRobots, true)

  const toggleLabwareOffsetData = (): void => {
    dispatch(
      Config.updateConfigValue(
        'labware.showLabwareOffsetCodeSnippets',
        Boolean(!isLabwareOffsetCodeSnippetsOn)
      )
    )
  }

  const handleChannel = (_: string, value: string): void => {
    dispatch(Config.updateConfigValue('update.channel', value))
  }

  const formatOptionLabel: React.ComponentProps<
    typeof SelectField
  >['formatOptionLabel'] = (option, index): JSX.Element => {
    const { label, value } = option
    return (
      <StyledText
        as="p"
        textTransform={TYPOGRAPHY.textTransformCapitalize}
        id={index}
      >
        {value === 'latest' ? label : value}
      </StyledText>
    )
  }

  return (
    <>
      <Box paddingX={SPACING.spacing16} paddingY={SPACING.spacing24}>
        <Flex
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          gridGap={SPACING.spacing40}
        >
          {showConfirmDeleteUnavailRobots ? (
            <Portal level="top">
              <LegacyModal
                type="warning"
                title={t('clear_unavailable_robots')}
                onClose={cancelExit}
              >
                <StyledText as="p">{t('clearing_cannot_be_undone')}</StyledText>
                <Flex
                  flexDirection={DIRECTION_ROW}
                  paddingTop={SPACING.spacing32}
                  justifyContent={JUSTIFY_FLEX_END}
                >
                  <Flex
                    paddingRight={SPACING.spacing4}
                    data-testid="AdvancedSettings_ConfirmClear_Cancel"
                  >
                    <Btn
                      onClick={cancelExit}
                      textTransform={TYPOGRAPHY.textTransformCapitalize}
                      color={COLORS.blue50}
                      fontWeight={TYPOGRAPHY.fontWeightSemiBold}
                      marginRight={SPACING.spacing32}
                    >
                      {t('shared:cancel')}
                    </Btn>
                  </Flex>
                  <Flex data-testid="AdvancedSettings_ConfirmClear_Proceed">
                    <AlertPrimaryButton onClick={confirmDeleteUnavailRobots}>
                      {t('clear_confirm')}
                    </AlertPrimaryButton>
                  </Flex>
                </Flex>
              </LegacyModal>
            </Portal>
          ) : null}
          <Flex flexDirection={DIRECTION_COLUMN}>
            <StyledText
              css={TYPOGRAPHY.h3SemiBold}
              paddingBottom={SPACING.spacing8}
              id="AdvancedSettings_updatedChannel"
            >
              {t('update_channel')}
            </StyledText>
            <StyledText as="p" paddingBottom={SPACING.spacing8}>
              {t('update_description')}
            </StyledText>
          </Flex>
          <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
            <StyledText css={TYPOGRAPHY.labelSemiBold}>
              {t('channel')}
            </StyledText>
            <SelectField
              name={'__UpdateChannel__'}
              options={channelOptions}
              onValueChange={handleChannel}
              value={channel}
              placeholder={channel}
              formatOptionLabel={formatOptionLabel}
              isSearchable={false}
              width="10rem"
            />
          </Flex>
        </Flex>
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
        <Flex
          alignItems={ALIGN_CENTER}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          gridGap={SPACING.spacing40}
        >
          <Box>
            <StyledText
              css={TYPOGRAPHY.h3SemiBold}
              paddingBottom={SPACING.spacing8}
              id="AdvancedSettings_clearRobots"
            >
              {t('clear_unavail_robots')}
            </StyledText>
            <StyledText as="p">{t('clear_robots_description')}</StyledText>
          </Box>
          <TertiaryButton
            marginLeft={SPACING_AUTO}
            onClick={confirmDeleteUnavailRobots}
            id="AdvancedSettings_clearUnavailableRobots"
          >
            {t('clear_robots_button')}
          </TertiaryButton>
        </Flex>
        <Divider marginY={SPACING.spacing24} />
        <ShowHeaterShakerAttachmentModal />
        <Divider marginY={SPACING.spacing24} />
        <Flex alignItems={ALIGN_CENTER} justifyContent={JUSTIFY_SPACE_BETWEEN}>
          <Box width="70%">
            <StyledText
              css={TYPOGRAPHY.h3SemiBold}
              paddingBottom={SPACING.spacing8}
              id="AdvancedSettings_showLink"
            >
              {t('show_labware_offset_snippets')}
            </StyledText>
            <StyledText as="p">
              {t('show_labware_offset_snippets_description')}
            </StyledText>
          </Box>
          <ToggleButton
            label="show_link_to_get_labware_offset_data"
            toggledOn={isLabwareOffsetCodeSnippetsOn}
            onClick={toggleLabwareOffsetData}
            id="AdvancedSettings_showLinkToggleButton"
          />
        </Flex>
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
