import * as React from 'react'
import { Box } from '../primitives'

export interface RobotCoordsForeignDivProps {
  width?: string | number
  height?: string | number
  x?: string | number
  y?: string | number
  children?: React.ReactNode
  className?: string
  innerDivProps?: React.ComponentProps<typeof Box>
  transformWithSVG?: boolean
  extraTransform?: string
}

export const RobotCoordsForeignDiv = (
  props: RobotCoordsForeignDivProps
): JSX.Element => {
  const {
    children,
    x = 0,
    y = 0,
    height = '100%',
    width = '100%',
    className,
    innerDivProps,
    transformWithSVG = false,
    extraTransform = '',
  } = props

  const transform = `scale(1, -1) ${extraTransform}`
  return (
    <foreignObject
      {...{ x, y, height, width, className }}
      transform={transformWithSVG ? transform : extraTransform}
    >
      <Box
        {...innerDivProps}
        style={transformWithSVG ? {} : { transform }}
        xmlns="http://www.w3.org/1999/xhtml"
      >
        {children}
      </Box>
    </foreignObject>
  )
}
