import { useTranslation } from 'react-i18next'
import {
  DIRECTION_COLUMN,
  Flex,
  SPACING,
  StyledText,
  TertiaryButton,
} from '@opentrons/components'
import type { LiquidHandlingTab } from '../../types'

interface ResetSettingsFieldProps {
  tab: LiquidHandlingTab
  onClick: () => void
}

export function ResetSettingsField(
  props: ResetSettingsFieldProps
): JSX.Element {
  const { tab, onClick } = props
  const { t } = useTranslation(['protocol_steps'])

  return (
    <Flex
      flexDirection={DIRECTION_COLUMN}
      padding={`0 ${SPACING.spacing16}`}
      paddingBottom={SPACING.spacing40}
    >
      <TertiaryButton onClick={onClick} buttonType="white">
        <StyledText desktopStyle="captionSemiBold">
          {t(`protocol_steps:reset_settings`, { tab })}
        </StyledText>
      </TertiaryButton>
    </Flex>
  )
}
