import styled from 'styled-components'

import { TYPOGRAPHY, SPACING } from '../../ui-style-constants'
import { isntStyleProp, styleProps } from '../../primitives'
import { BORDERS, COLORS } from '../../helix-design-system'
import { CURSOR_DEFAULT, CURSOR_POINTER } from '../../index'
import type { StyleProps } from '../../index'

interface SecondaryButtonProps extends StyleProps {
  /** button action is dangerous and may have non-reversible side-effects for user */
  isDangerous?: boolean
  'aria-disabled'?: boolean
}
export const SecondaryButton = styled.button.withConfig<SecondaryButtonProps>({
  shouldForwardProp: p =>
    isntStyleProp(p) && p !== 'isDangerous' && p !== 'aria-disabled',
})<SecondaryButtonProps>`
  appearance: none;
  cursor: ${props =>
    props['aria-disabled'] ? CURSOR_DEFAULT : CURSOR_POINTER};
  color: ${props => {
    if (props['aria-disabled']) return COLORS.grey40
    return props.isDangerous ? COLORS.red50 : COLORS.blue50
  }};
  border: ${BORDERS.lineBorder};
  border-color: ${props => {
    if (props['aria-disabled']) return COLORS.grey30
    return props.isDangerous ? COLORS.red50 : 'initial'
  }};
  border-radius: ${BORDERS.borderRadius8};
  padding: ${SPACING.spacing8} ${SPACING.spacing16};
  text-transform: ${TYPOGRAPHY.textTransformNone};
  background-color: ${COLORS.transparent};
  ${TYPOGRAPHY.pSemiBold}

  &:hover,
  &:focus {
    box-shadow: ${props =>
      props['aria-disabled'] ? 'none' : '0px 3px 6px 0px rgba(0, 0, 0, 0.23)'};
  }

  &:hover {
    color: ${props => {
      if (props['aria-disabled']) return COLORS.grey40
      return props.isDangerous ? COLORS.red50 : COLORS.blue60
    }};
    border-color: ${props => {
      if (props['aria-disabled']) return COLORS.grey30
      return props.isDangerous ? COLORS.red50 : COLORS.blue55
    }};
    box-shadow: ${props => (props['aria-disabled'] ? 'none' : '0 0 0')};
  }

  &:focus-visible {
    color: ${props => {
      if (props['aria-disabled']) return COLORS.grey40
      return props.isDangerous ? COLORS.red60 : COLORS.blue60
    }};
    border-color: ${props => {
      if (props['aria-disabled']) return COLORS.grey30
      return props.isDangerous ? COLORS.red50 : COLORS.blue60
    }};
    box-shadow: ${props =>
      props['aria-disabled'] ? 'none' : `0 0 0 3px ${COLORS.yellow50}`};
  }

  &:active {
    box-shadow: none;
    color: ${props => {
      if (props['aria-disabled']) return COLORS.grey40
      return props.isDangerous ? COLORS.red60 : COLORS.blue55
    }};
    border-color: ${props => {
      if (props['aria-disabled']) return COLORS.grey30
      return props.isDangerous ? COLORS.red60 : COLORS.blue55
    }};
  }

  &:disabled,
  &.disabled {
    box-shadow: none;
    border-color: ${COLORS.grey30};
    color: ${COLORS.grey40};
    cursor: ${CURSOR_DEFAULT};
  }

  ${styleProps}
`
