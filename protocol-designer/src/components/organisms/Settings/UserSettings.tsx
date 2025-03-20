import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'

import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SPACING,
  StyledText,
  TYPOGRAPHY,
} from '@opentrons/components'

import { actions as tutorialActions } from '../../../tutorial'
import { actions as featureFlagActions } from '../../../feature-flags'
import { ToggleButton } from '../../atoms/ToggleButton'

import type { FlagTypes } from '../../../feature-flags'

const userFacingFlags: FlagTypes[] = [
  'OT_PD_ENABLE_HOT_KEYS_DISPLAY',
  'OT_PD_ENABLE_MULTIPLE_TEMPS_OT2',
  'OT_PD_DISABLE_MODULE_RESTRICTIONS',
]

interface UserSettingsProps {
  canClearHintDismissals: boolean
  flags: Partial<Record<FlagTypes, boolean | null | undefined>>
}

export function UserSettings({
  canClearHintDismissals,
  flags,
}: UserSettingsProps): JSX.Element {
  const { t } = useTranslation(['feature_flags', 'shared'])
  const dispatch = useDispatch()
  const setFeatureFlags = (
    flags: Partial<Record<FlagTypes, boolean | null | undefined>>
  ): void => {
    dispatch(featureFlagActions.setFeatureFlags(flags))
  }

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
      height="100%"
    >
      <Flex>
        <StyledText desktopStyle="bodyLargeSemiBold">
          {t('shared:user_settings')}
        </StyledText>
      </Flex>
      <ListItem
        padding={SPACING.spacing16}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        type="default"
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {t('shared:hints')}
          </StyledText>
          <Flex color={COLORS.grey60}>
            <StyledText desktopStyle="bodyDefaultRegular">
              {t('shared:show_hints_and_tips')}
            </StyledText>
          </Flex>
        </Flex>
        <Btn
          disabled={!canClearHintDismissals}
          textDecoration={
            canClearHintDismissals ? TYPOGRAPHY.textDecorationUnderline : 'none'
          }
          onClick={() => dispatch(tutorialActions.clearAllHintDismissals())}
        >
          <StyledText desktopStyle="bodyDefaultRegular">
            {canClearHintDismissals
              ? t('shared:reset')
              : t('shared:no_hints_to_restore')}
          </StyledText>
        </Btn>
      </ListItem>
      {userFacingFlags.map(flag => (
        <ListItem
          key={flag}
          padding={SPACING.spacing16}
          justifyContent={JUSTIFY_SPACE_BETWEEN}
          type="default"
          gridGap={SPACING.spacing40}
          alignItems={ALIGN_CENTER}
        >
          <Flex flexDirection={DIRECTION_COLUMN}>
            <StyledText desktopStyle="bodyDefaultSemiBold">
              {t(`${flag}.title`)}
            </StyledText>
            <Flex color={COLORS.grey60}>
              <StyledText desktopStyle="bodyDefaultRegular">
                {t(`${flag}.description`)}
              </StyledText>
            </Flex>
          </Flex>
          <ToggleButton
            label={`Settings_${flag}`}
            toggledOn={Boolean(flags[flag])}
            onClick={() => {
              setFeatureFlags({
                [flag]: !flags[flag],
              })
            }}
          />
        </ListItem>
      ))}
    </Flex>
  )
}
