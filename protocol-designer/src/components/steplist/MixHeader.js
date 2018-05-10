// @flow
import * as React from 'react'
import styles from './StepItem.css'

type Props = {
  volume: ?string,
  times: ?string,
  labwareName: ?string
}

export default function MixHeader (props: Props) {
  const {volume, times, labwareName} = props
  return <li className={styles.step_subitem}>
    <span className={styles.emphasized_cell}>{labwareName}</span>
    <span>{volume} uL</span>
    <span>{times}x</span>
  </li>
}
