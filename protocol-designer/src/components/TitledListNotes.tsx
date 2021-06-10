// @flow
import { i18n } from '../localization'
import * as React from 'react'
import styles from './TitledListNotes.css'

type Props = {
  notes: string | null | undefined
}

export function TitledListNotes(props: Props): JSX.Element | null {
  return props.notes ? (
    <div className={styles.notes}>
      <header>{i18n.t('card.notes')}</header>
      {props.notes}
    </div>
  ) : null
}
