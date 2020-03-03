// @flow
import * as React from 'react'
import classnames from 'classnames'
import styles from './navbar.css'

export type VerticalNavBarProps = {|
  className?: string,
  children: React.Node,
|}

export function VerticalNavBar(props: VerticalNavBarProps) {
  const className = classnames(styles.navbar, props.className)
  return <nav className={className}>{props.children}</nav>
}
