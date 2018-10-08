// @flow
import * as React from 'react'
import styles from './styles.css'

type Props = {message: React.Node}

export default function UpdateRobotMessage (props: Props) {
  return (
    <p className={styles.update_message}>
      {props.message}
    </p>
  )
}
