// @flow
import * as React from 'react'
import styles from './styles.css'

type Props = {
  children: React.Node,
}
export default function CardContainer(props: Props) {
  return <div className={styles.card_container}>{props.children}</div>
}
