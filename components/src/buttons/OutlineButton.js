// @flow
import * as React from 'react'
import cx from 'classnames'

import type { ButtonProps } from './Button'
import Button from './Button'
import styles from './buttons.css'

/**
 * Button with no background fill and a dark border.
 Use inverted prop for buttons on dark backgrounds.
 */
export default function OutlineButton(props: ButtonProps) {
  const className = cx(styles.button_outline, props.className, {
    [styles.inverted]: props.inverted,
  })

  return (
    <Button {...props} className={className}>
      {props.children}
    </Button>
  )
}
