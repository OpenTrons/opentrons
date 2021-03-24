import styled, { css } from 'styled-components'

import * as Styles from '../styles'
import { styleProps, isntStyleProp } from './style-props'

import type { PrimitiveComponent } from './types'

export const BUTTON_TYPE_SUBMIT: 'submit' = 'submit'
export const BUTTON_TYPE_RESET: 'reset' = 'reset'
export const BUTTON_TYPE_BUTTON: 'button' = 'button'

const BUTTON_BASE_STYLE = css`
  appearance: none;
  padding: 0;
  border-width: 0;
  border-style: solid;
  background-color: transparent;
  cursor: pointer;

  &:disabled,
  &.disabled {
    cursor: default;
  }
`

const BUTTON_VARIANT_STYLE = css`
  border-color: inherit;
  border-radius: ${Styles.BORDER_RADIUS_DEFAULT};
  display: ${Styles.DISPLAY_INLINE_BLOCK};
  font-size: ${Styles.FONT_SIZE_BODY_2};
  font-weight: ${Styles.FONT_WEIGHT_SEMIBOLD};
  line-height: 1.4;
  padding-left: ${Styles.SPACING_4};
  padding-right: ${Styles.SPACING_4};
  padding-top: ${Styles.SPACING_2};
  padding-bottom: ${Styles.SPACING_2};
  text-align: ${Styles.TEXT_ALIGN_CENTER};
  text-transform: ${Styles.TEXT_TRANSFORM_UPPERCASE};
`

type BtnComponent = PrimitiveComponent<'button'>

/**
 * Button primitive
 *
 * @component
 */
export const Btn: BtnComponent = styled.button
  .withConfig({
    shouldForwardProp: isntStyleProp,
  })
  .attrs((props: React.HTMLProps<HTMLButtonElement>) => ({
    type: props.type ?? BUTTON_TYPE_BUTTON,
  }))`
  ${BUTTON_BASE_STYLE}
  ${styleProps}
`

/**
 * Primary button variant
 *
 * @component
 */
export const PrimaryBtn: BtnComponent = styled(Btn)`
  ${BUTTON_VARIANT_STYLE}
  background-color: ${Styles.C_DARK_GRAY};
  color: ${Styles.C_WHITE};
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.2);

  &:hover,
  &:focus {
    background-color: ${Styles.C_BLACK};
  }

  &:active {
    background-color: ${Styles.C_MED_DARK_GRAY};
  }

  &:disabled,
  &.disabled {
    background-color: ${Styles.C_LIGHT_GRAY};
    color: ${Styles.C_MED_GRAY};
    box-shadow: none;
  }

  ${styleProps}
`

/**
 * Secondary button variant
 *
 * @component
 */
export const SecondaryBtn: BtnComponent = styled(Btn)`
  ${BUTTON_VARIANT_STYLE}
  background-color: ${Styles.C_WHITE};
  border-width: ${Styles.BORDER_WIDTH_DEFAULT};
  color: ${Styles.C_DARK_GRAY};

  &:hover,
  &:focus {
    background-color: ${Styles.C_LIGHT_GRAY};
  }

  &:active {
    background-color: ${Styles.C_MED_LIGHT_GRAY};
  }

  &:disabled,
  &.disabled {
    background-color: ${Styles.C_WHITE};
    color: ${Styles.C_MED_GRAY};
  }

  ${styleProps}
`

/**
 * Light secondary button variant
 *
 * @component
 */
export const LightSecondaryBtn: BtnComponent = styled(SecondaryBtn)`
  background-color: ${Styles.C_TRANSPARENT};
  color: ${Styles.C_WHITE};

  &:hover,
  &:focus {
    background-color: ${Styles.OVERLAY_WHITE_10};
  }

  &:active {
    background-color: ${Styles.OVERLAY_WHITE_20};
  }

  &:disabled,
  &.disabled {
    background-color: ${Styles.C_TRANSPARENT};
    color: ${Styles.C_MED_GRAY};
  }

  ${styleProps}
`

/**
 * Tertiary button variant
 *
 * @component
 */
export const TertiaryBtn: BtnComponent = styled(LightSecondaryBtn)`
  border-width: 0;
`
