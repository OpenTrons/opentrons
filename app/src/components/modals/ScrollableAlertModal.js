// @flow
// AlertModal for updating to newest app version
import * as React from 'react'
import omit from 'lodash/omit'

import { AlertModal } from '@opentrons/components'
import { BottomButtonBar } from './'
import styles from './styles.css'

type Props = React.ElementProps<typeof AlertModal>

export default function ScrollableAlertModal(props: Props) {
  return (
    <AlertModal
      {...omit(props, 'buttons', 'children')}
      className={styles.scrollable_modal}
      contentsClassName={styles.scrollable_modal_contents}
      alertOverlay
    >
      <div className={styles.scrollable_modal_scroll}>{props.children}</div>
      {props.buttons && <BottomButtonBar buttons={props.buttons} />}
    </AlertModal>
  )
}
