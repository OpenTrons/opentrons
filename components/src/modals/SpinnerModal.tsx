// titled modal page component
import cx from 'classnames'
import { Overlay } from './Overlay'
import { Icon } from '../icons'

import styles from './modals.module.css'

export interface SpinnerModalProps {
  /** Additional/Override style */
  contentsClassName?: string
  /** Optional message to display as italic text below spinner */
  message?: string
  /** lightens overlay (alert modal over existing modal) */
  alertOverlay?: boolean
}

// TODO(ja, 8/2/24): this modal and SpinnerModalPage are only used in utils
// that are no longer in use, investigate deleting them
/**
 * @deprecated use Modal instead
 * Spinner Modal with no background and optional message
 */
export function SpinnerModal(props: SpinnerModalProps): JSX.Element {
  return (
    <div className={styles.modal}>
      <Overlay alertOverlay={props.alertOverlay} />
      <div
        className={cx(styles.spinner_modal_contents, props.contentsClassName)}
      >
        <Icon name="ot-spinner" className={styles.spinner_modal_icon} spin />
        <p>{props.message}</p>
      </div>
    </div>
  )
}
