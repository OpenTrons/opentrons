import * as React from 'react'
import { css } from 'styled-components'

import { FONT_BODY_1_LIGHT, C_DARK_GRAY } from '../styles'
import { ARROW_SIZE_PX } from './styles'
import { Box } from '../primitives'

import type { CSSProperties } from 'react'
import type { FlattenSimpleInterpolation } from 'styled-components'
import type { Placement } from './types'
import type { StyleProps } from '../primitives'

const TOOLTIP_CSS = css`
  position: absolute;
  z-index: 9001;
  padding: 0.5rem;
  ${FONT_BODY_1_LIGHT}
  background-color: ${C_DARK_GRAY};
  box-shadow: 0 3px 6px 0 rgba(0, 0, 0, 0.13), 0 3px 6px 0 rgba(0, 0, 0, 0.23);
  cursor: pointer;
`

export interface TooltipProps extends StyleProps {
  /** Whether or not the tooltip should be rendered */
  visible: boolean
  /** Contents of the tooltip */
  children?: React.ReactNode
  /**
   * Tooltip element ID (provided by useTooltip). Will match
   * targetProps.aria-describedby
   */
  id: string
  /** Actual tooltip placement, if known (provided by useTooltip) */
  placement: Placement | null
  /** Inline styles to apply to the tooltip element (provided by useTooltip) */
  style: CSSProperties
  /** React function ref for tooltip's arrow element (provided by useTooltip) */
  arrowRef: React.RefCallback<HTMLElement | null>
  /** Inline styles to apply to arrow element (provided by useTooltip) */
  arrowStyle: CSSProperties
}

/**
 * Tooltip component that renders based on its `visible` prop. For use with the
 * `useTooltip` and `useHoverTooltip` hooks. See examples in `Tooltip.md`.
 */
export const Tooltip = React.forwardRef(function TooltipComponent(
  props: TooltipProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const {
    visible,
    placement,
    id,
    style,
    arrowRef,
    arrowStyle,
    children,
    ...boxProps
  } = props

  return visible ? (
    <Box
      role="tooltip"
      id={id}
      style={style}
      ref={ref}
      css={TOOLTIP_CSS}
      {...boxProps}
    >
      {children}
      <Arrow {...{ arrowRef, arrowStyle, placement }} />
    </Box>
  ) : null
})

// shift arrows off the element
const ARROW_ANCHOR_OFFSET = `-${ARROW_SIZE_PX}px;`

// use borders to create arrows
const ARROW_CSS_BASE = css`
  position: absolute;
  border-width: ${ARROW_SIZE_PX}px;
  border-style: solid;
  border-color: transparent;
`

// arrow pointing down from the top tooltip
const ARROW_CSS_TOP = css`
  ${ARROW_CSS_BASE}
  bottom: ${ARROW_ANCHOR_OFFSET};
  border-bottom-style: none;
  border-top-color: ${C_DARK_GRAY};
`

// arrow pointing left from the right tooltip
const ARROW_CSS_RIGHT = css`
  ${ARROW_CSS_BASE}
  left: ${ARROW_ANCHOR_OFFSET};
  border-left-style: none;
  border-right-color: ${C_DARK_GRAY};
`

// arrow pointing up from the bottom tooltip
const ARROW_CSS_BOTTOM = css`
  ${ARROW_CSS_BASE}
  top: ${ARROW_ANCHOR_OFFSET};
  border-top-style: none;
  border-bottom-color: ${C_DARK_GRAY};
`

// arrow pointing right from the left tooltip
const ARROW_CSS_LEFT = css`
  ${ARROW_CSS_BASE}
  right: ${ARROW_ANCHOR_OFFSET};
  border-right-style: none;
  border-left-color: ${C_DARK_GRAY};
`

const ARROW_CSS_BY_PLACEMENT_BASE: Record<
  string,
  FlattenSimpleInterpolation
> = {
  top: ARROW_CSS_TOP,
  right: ARROW_CSS_RIGHT,
  bottom: ARROW_CSS_BOTTOM,
  left: ARROW_CSS_LEFT,
}

export interface ArrowProps {
  placement: Placement | null
  arrowRef: React.RefCallback<HTMLElement>
  arrowStyle: CSSProperties
}

export function Arrow(props: ArrowProps): JSX.Element {
  const placement = props.placement ?? ''
  const placementBase = placement.split('-')[0]
  const arrowCss = ARROW_CSS_BY_PLACEMENT_BASE[placementBase]

  return <div ref={props.arrowRef} style={props.arrowStyle} css={arrowCss} />
}
