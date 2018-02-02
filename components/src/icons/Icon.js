// @flow
import * as React from 'react'
import classnames from 'classnames'

import ICON_DATA_BY_NAME, {type IconName} from './icon-data'
import styles from './icons.css'

export type IconProps = {
  /** name constant of the icon to display */
  name: IconName,
  /** classes to apply */
  className?: string,
  /** spin the icon with a CSS animation */
  spin?: boolean,
  /** x attribute as a number or string (for nesting inside another SVG) */
  x?: number | string,
  /** y attribute as a number or string (for nesting inside another SVG) */
  y?: number | string,
  /** width as a number or string (for nesting inside another SVG) */
  height?: number | string,
  /** height as a number or string (for nesting inside another SVG) */
  width?: number | string
}

/**
 * Inline SVG icon component
 *
 * If you need access to the IconName type, you can:
 * ```js
 * import {type IconName} from '@opentrons/components'
 * ```
 */
export default function Icon (props: IconProps) {
  const {x, y, height, width} = props
  const {viewBox, path} = ICON_DATA_BY_NAME[props.name]
  const className = classnames(props.className, {
    [styles.spin]: props.spin
  })

  return (
    <svg
      version='1.1'
      aria-hidden='true'
      viewBox={viewBox}
      className={className}
      fill='currentColor'
      {...{x, y, height, width}}
    >
      <path fillRule='evenodd' d={path} />
    </svg>
  )
}
