import * as React from 'react'
import { css } from 'styled-components'
import { Btn, COLORS, SPACING } from '@opentrons/components'

const overflowButtonStyles = css`
  border-radius: ${SPACING.spacing2};
  max-height: ${SPACING.spacing6};

  &:hover {
    background-color: #16212d15;
  }

  &:active {
    background-color: #16212d25;
    box-shadow: 0 0 0 1px ${COLORS.darkBlack};
  }

  &:active circle {
    fill: ${COLORS.darkBlack};
  }

  &:focus {
    box-shadow: 0 0 0 3px ${COLORS.warning};
  }

  &:enabled {
    fill-opacity: 0.5;
    font-color: ${COLORS.darkGreyEnabled};
  }

  &:disabled,
  &.disabled {
    fill-opacity: 0.5;
  }
`

export const OverflowBtn = React.forwardRef(
  (props: React.ComponentProps<typeof Btn>, ref): JSX.Element | null => (
    <Btn css={overflowButtonStyles} {...props} ref={ref}>
      <svg
        width="19"
        height="31"
        viewBox="0 0 19 31"
        fill={COLORS.darkGrey}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="9.5" cy="9.5" r="1.5" />
        <circle cx="9.5" cy="15.5" r="1.5" />
        <circle cx="9.5" cy="21.5" r="1.5" />
      </svg>
      {props.children}
    </Btn>
  )
)
