// @flow
import * as React from 'react'
import cx from 'classnames'

import styles from './modals.css'

type OverlayProps = {
  /** optional onClick handler */
  onClick?: (event: SyntheticEvent<>) => mixed,
  alertOverlay?: boolean
}

/**
 * Dark, semi-transparent overlay for the background of a modal. If you need
 * to make a custom modal component, use `<Overlay>`, otherwise you might
 * just want to use `<Modal>`
 */
export default function Overlay (props: OverlayProps) {
  const clickable = props.onClick && !props.alertOverlay
  const className = cx(
    styles.overlay,
    {[styles.clickable]: clickable, [styles.alert_modal_overlay]: props.alertOverlay}
  )

  return (
    <div className={className} onClick={clickable && props.onClick} />
  )
}
