import { css } from 'styled-components'
import {
  ALIGN_CENTER,
  Btn,
  COLORS,
  Flex,
  Icon,
  SPACING,
  StyledText,
} from '@opentrons/components'

interface ToggleProps {
  isSelected: boolean
  onClick: () => void
  label: string
  disabled?: boolean
}
export function Toggle(props: ToggleProps): JSX.Element {
  const { isSelected, onClick, label, disabled = false } = props
  return (
    <Flex gridGap={SPACING.spacing8} alignItems={ALIGN_CENTER}>
      <StyledText desktopStyle="bodyDefaultRegular" color={COLORS.grey60}>
        {label}
      </StyledText>
      <Btn
        role="switch"
        size="2rem"
        css={isSelected ? TOGGLE_ENABLED_STYLES : TOGGLE_DISABLED_STYLES}
        onClick={disabled ? undefined : onClick}
      >
        <Icon
          name={isSelected ? 'ot-toggle-input-on' : 'ot-toggle-input-off'}
          size="1rem"
        />
      </Btn>
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
