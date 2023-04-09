import * as React from 'react'
import { css } from 'styled-components'

import {
  Icon,
  Btn,
  ALIGN_CENTER,
  COLORS,
  JUSTIFY_CENTER,
  SPACING,
} from '@opentrons/components'

const STOP_BUTTON_STYLE = css`
  display: flex;
  background-color: ${COLORS.red_two};
  border-radius: 50%;

  &:focus {
    background-color: #c41e20;
    box-shadow: none;
  }
  &:hover {
    border: none;
    box-shadow: none;
    background-color: ${COLORS.red_two};
    color: ${COLORS.white};
  }
  &:focus-visible {
    box-shadow: 0 0 0 ${SPACING.spacing1} ${COLORS.fundamentalsFocus};
    background-color: ${COLORS.red_two};
  }
  &:active {
    background-color: ${COLORS.red_two};
  }
  &:disabled {
    background-color: ${COLORS.darkBlack_twenty};
    color: ${COLORS.darkBlack_sixty};
  }
`

interface StopButtonProps {
  onStop?: () => void
  /** default size 12.5rem */
  buttonSize?: string
  /** default size 10rem */
  iconSize?: string
}
export function StopButton({
  onStop,
  buttonSize = '12.5rem',
  iconSize = '10rem',
}: StopButtonProps): JSX.Element {
  return (
    <Btn
      css={STOP_BUTTON_STYLE}
      height={buttonSize}
      width={buttonSize}
      alignItems={ALIGN_CENTER}
      justifyContent={JUSTIFY_CENTER}
      onClick={onStop}
      aria-label="stop"
    >
      <Icon name="close" color={COLORS.white} size={iconSize} />
    </Btn>
  )
}
