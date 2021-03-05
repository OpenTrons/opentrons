// TODO(mc, 2020-02-19): no longer used; remove
import * as React from 'react'

export interface CenteredTextSvgProps {
  text: React.ReactNode
  className?: string
}

/**
 * @deprecated Use {@link RobotCoordsText}
 */
export function CenteredTextSvg(props: CenteredTextSvgProps): JSX.Element {
  const { text, className } = props

  // TODO(mc, 2018-07-23): add `fill='currentColor'`
  return (
    <text
      className={className}
      x="50%"
      y="50%"
      textAnchor="middle"
      dominantBaseline="middle"
    >
      {/* TODO(mc, 2018-07-23): use props.children */}
      {text}
    </text>
  )
}
