import { Button } from './Button'
import type { ButtonProps } from './Button'
import styles from './buttons.css'
import cx from 'classnames'
import * as React from 'react'

/**
 * Button with no background fill and a dark border.
 * Use inverted prop for buttons on dark backgrounds.
 *
 * @deprecated Use {@link SecondaryBtn}
 */
export function OutlineButton(props: ButtonProps): JSX.Element {
  const className = cx(styles.button_outline, props.className, {
    [styles.inverted]: props.inverted,
  })

  return (
    <Button {...props} className={className}>
      {props.children}
    </Button>
  )
}
