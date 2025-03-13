import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import {
  Flex,
  DIRECTION_COLUMN,
  JUSTIFY_SPACE_BETWEEN,
  SPACING,
  StyledText,
  ListItem,
} from '@opentrons/components'

import { ToggleButton } from '../../atoms/ToggleButton'
import { actions as featureFlagActions } from '../../../feature-flags'

import type { FlagTypes } from '../../../feature-flags'

interface FeatureFlagProps {
  flags: Partial<Record<FlagTypes, boolean | null | undefined>>
}

export function FeatureFlag({ flags }: FeatureFlagProps): JSX.Element {
  const { t } = useTranslation('shared')
  const dispatch = useDispatch()
  const getDescription = (flag: FlagTypes): string => {
    return flag === 'OT_PD_DISABLE_MODULE_RESTRICTIONS'
      ? t(`feature_flags:${flag}.description_1`)
      : t(`feature_flags:${flag}.description`)
  }

  const setFeatureFlags = (
    flags: Partial<Record<FlagTypes, boolean | null | undefined>>
  ): void => {
    dispatch(featureFlagActions.setFeatureFlags(flags))
  }

  const toFlagRow = (flagName: FlagTypes): JSX.Element => {
    return (
      <Flex key={flagName} justifyContent={JUSTIFY_SPACE_BETWEEN}>
        <Flex flexDirection={DIRECTION_COLUMN}>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {t(`feature_flags:${flagName}.title`)}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">
            {getDescription(flagName)}
          </StyledText>
        </Flex>
        <ToggleButton
          label={`Settings_${flagName}`}
          toggledOn={Boolean(flags[flagName])}
          onClick={() => {
            setFeatureFlags({
              [flagName as string]: !flags[flagName],
            })
          }}
        />
      </Flex>
    )
  }
  const allFlags = Object.keys(flags) as FlagTypes[]
  const userFacingFlags: FlagTypes[] = [
    'OT_PD_ENABLE_HOT_KEYS_DISPLAY',
    'OT_PD_ENABLE_MULTIPLE_TEMPS_OT2',
    'OT_PD_DISABLE_MODULE_RESTRICTIONS',
  ]

  const prereleaseFlagRows = allFlags
    .filter(flag => !userFacingFlags.includes(flag))
    .map(toFlagRow)
  return (
    <Flex flexDirection={DIRECTION_COLUMN} gridGap={SPACING.spacing8}>
      <StyledText desktopStyle="bodyLargeSemiBold">
        {t('developer_ff')}
      </StyledText>
      <ListItem
        type="default"
        padding={SPACING.spacing16}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        flexDirection={DIRECTION_COLUMN}
        gridGap={SPACING.spacing16}
      >
        {prereleaseFlagRows}
      </ListItem>
    </Flex>
  )
}
