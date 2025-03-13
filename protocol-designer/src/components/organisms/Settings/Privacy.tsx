import { useTranslation } from 'react-i18next'
import { useDispatch } from 'react-redux'
import { css } from 'styled-components'

import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  DIRECTION_COLUMN,
  Flex,
  Icon,
  JUSTIFY_SPACE_BETWEEN,
  ListItem,
  SPACING,
  StyledText,
} from '@opentrons/components'

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
        <Btn
          role="switch"
          data-testid="analyticsToggle"
          size="2rem"
          css={
            Boolean(hasOptedIn) ? TOGGLE_ENABLED_STYLES : TOGGLE_DISABLED_STYLES
          }
          onClick={() =>
            dispatch(
              hasOptedIn ? analyticsActions.optOut() : analyticsActions.optIn()
            )
          }
        >
          <Icon
            name={hasOptedIn ? 'ot-toggle-input-on' : 'ot-toggle-input-off'}
            height="1rem"
          />
        </Btn>
      </ListItem>
    </Flex>
  )
}

const TOGGLE_DISABLED_STYLES = css`
  color: ${COLORS.grey50};

  &:hover {
    color: ${COLORS.grey55};
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${COLORS.yellow50};
  }

  &:disabled {
    color: ${COLORS.grey30};
  }
`

const TOGGLE_ENABLED_STYLES = css`
  color: ${COLORS.blue50};

  &:hover {
    color: ${COLORS.blue55};
  }

  &:focus-visible {
    box-shadow: 0 0 0 3px ${COLORS.yellow50};
  }

  &:disabled {
    color: ${COLORS.grey30};
  }
`
