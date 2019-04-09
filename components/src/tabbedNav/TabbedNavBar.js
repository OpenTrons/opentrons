// @flow
import * as React from 'react'
import cx from 'classnames'
import styles from './navbar.css'

type Props = {
  className?: string,
  topChildren?: React.Node,
  bottomChildren?: React.Node,
}

export default function TabbedNavBar(props: Props) {
  const className = cx(styles.navbar, props.className)
  return (
    <nav className={className}>
      <div className={styles.top_section}>{props.topChildren}</div>

      <div className={styles.filler} />

      <div className={styles.bottom_section}>{props.bottomChildren}</div>
    </nav>
  )
}
