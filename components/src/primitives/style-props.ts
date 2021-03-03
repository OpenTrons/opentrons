// common styling props you can apply to any primitive component
// props are string type for flexibility, but try to use constants for safety

import pick from 'lodash/pick'

import * as Types from './types'

import type { StyledComponentProps } from 'styled-components'

const COLOR_PROPS = ['color', 'backgroundColor', 'opacity']

const TYPOGRAPHY_PROPS = [
  'fontSize',
  'fontWeight',
  'fontStyle',
  'lineHeight',
  'textAlign',
  'textTransform',
  'textDecoration',
]

const SPACING_PROPS = [
  'margin',
  'marginX',
  'marginY',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingX',
  'paddingY',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
]

const BORDER_PROPS = [
  'border',
  'borderTop',
  'borderRight',
  'borderBottom',
  'borderLeft',
  'borderRadius',
  'borderWidth',
  'borderColor',
]

const FLEXBOX_PROPS = [
  'flex',
  'alignItems',
  'justifyContent',
  'flexDirection',
  'flexWrap',
  'alignSelf',
]

const GRID_PROPS = [
  'gridGap',
  'gridTemplateRows',
  'gridTemplateColumns',
  'gridRow',
  'gridColumn',
]

const LAYOUT_PROPS = [
  'display',
  'size',
  'width',
  'minWidth',
  'maxWidth',
  'height',
  'minHeight',
  'maxHeight',
  'overflow',
  'overflowX',
  'overflowY',
  'wordSpacing',
]

const POSITION_PROPS = ['position', 'zIndex', 'top', 'right', 'bottom', 'left']

const STYLE_PROPS = [
  ...COLOR_PROPS,
  ...TYPOGRAPHY_PROPS,
  ...SPACING_PROPS,
  ...BORDER_PROPS,
  ...FLEXBOX_PROPS,
  ...GRID_PROPS,
  ...LAYOUT_PROPS,
  ...POSITION_PROPS,
]

const colorStyles = (
  props: Partial<Types.ColorProps>
): Partial<Types.ColorProps> => {
  return pick(props, COLOR_PROPS) as Types.ColorProps
}

const typographyStyles = (
  props: Partial<Types.TypographyProps>
): Partial<Types.TypographyProps> => {
  return pick(props, TYPOGRAPHY_PROPS) as Types.TypographyProps
}

const spacingStyles = (
  props: Partial<Types.SpacingProps>
): Partial<Types.TypographyProps> => {
  const { marginX, marginY, paddingX, paddingY, ...styles } = pick(
    props,
    SPACING_PROPS
  ) as Types.SpacingProps

  if (marginX != null) {
    styles.marginRight = styles.marginRight ?? marginX
    styles.marginLeft = styles.marginLeft ?? marginX
  }
  if (marginY != null) {
    styles.marginTop = styles.marginTop ?? marginY
    styles.marginBottom = styles.marginBottom ?? marginY
  }
  if (paddingX != null) {
    styles.paddingRight = styles.paddingRight ?? paddingX
    styles.paddingLeft = styles.paddingLeft ?? paddingX
  }
  if (paddingY != null) {
    styles.paddingTop = styles.paddingTop ?? paddingY
    styles.paddingBottom = styles.paddingBottom ?? paddingY
  }

  return styles
}

const borderStyles = (
  props: Partial<Types.BorderProps>
): Partial<Types.BorderProps> => {
  return pick(props, BORDER_PROPS) as Types.BorderProps
}

const flexboxStyles = (
  props: Partial<Types.FlexboxProps>
): Partial<Types.FlexboxProps> => {
  return pick(props, FLEXBOX_PROPS) as Types.FlexboxProps
}

const gridStyles = (
  props: Partial<Types.GridProps>
): Partial<Types.GridProps> => {
  return pick(props, GRID_PROPS) as Types.GridProps
}

const layoutStyles = (
  props: Partial<Types.LayoutProps>
): Partial<Types.LayoutProps> => {
  const { size, ...styles } = pick(props, LAYOUT_PROPS) as Types.LayoutProps

  if (size != null) {
    styles.width = styles.width ?? size
    styles.height = styles.height ?? size
  }

  return styles
}

const positionStyles = (
  props: Partial<Types.PositionProps>
): Partial<Types.PositionProps> => {
  return pick(props, POSITION_PROPS) as Types.PositionProps
}

export const styleProps = (
  props: Partial<Types.StyleProps>
): StyledComponentProps<{}, {}, {}, {}> => ({
  ...colorStyles(props),
  ...typographyStyles(props),
  ...spacingStyles(props),
  ...borderStyles(props),
  ...flexboxStyles(props),
  ...gridStyles(props),
  ...layoutStyles(props),
  ...positionStyles(props),
})

export const isntStyleProp = (prop: string): boolean =>
  !STYLE_PROPS.includes(prop)
