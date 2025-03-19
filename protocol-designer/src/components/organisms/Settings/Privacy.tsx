import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'

import {
  ALIGN_CENTER,
  DIRECTION_COLUMN,
  Flex,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SPACING,
  StyledText,
} from '@opentrons/components'

import { ToggleButton } from '../../atoms/ToggleButton'
import { actions as analyticsActions } from '../../../analytics'

interface PrivacyProps {
  hasOptedIn: boolean
}

export function Privacy({ hasOptedIn }: PrivacyProps): JSX.Element {
  const { t } = useTranslation(['feature_flags', 'shared'])
  const dispatch = useDispatch()

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      gridGap={SPACING.spacing8}
      height="100%"
    >
      <StyledText desktopStyle="bodyLargeSemiBold">
        {t('shared:privacy')}
      </StyledText>
      <ListItem
        padding={SPACING.spacing16}
        justifyContent={JUSTIFY_SPACE_BETWEEN}
        type="default"
        gridGap={SPACING.spacing40}
        alignItems={ALIGN_CENTER}
      >
        <Flex flexDirection={DIRECTION_COLUMN}>
          <StyledText desktopStyle="bodyDefaultSemiBold">
            {t('shared:shared_analytics')}
          </StyledText>
          <StyledText desktopStyle="bodyDefaultRegular">
            {t('shared:we_are_improving')}
          </StyledText>
        </Flex>
        <ToggleButton
          label="Settings_Privacy"
          toggledOn={Boolean(hasOptedIn)}
          onClick={() => {
            dispatch(
              hasOptedIn ? analyticsActions.optOut() : analyticsActions.optIn()
            )
          }}
        />
      </ListItem>
    </Flex>
  )
}
