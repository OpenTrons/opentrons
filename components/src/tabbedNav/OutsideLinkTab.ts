
import * as React from 'react'
import cx from 'classnames'

import styles from './navbar.css'
import { Button } from '../buttons'
import { NotificationIcon } from '../icons'

import type { IconName } from '../icons'

export type OutsideLinkTabProps = {
  /** optional click event for nav button */
  onClick?: (event: SyntheticEvent<>) => unknown,
  /** link to outside URL */
  to: string,
  /** position a single button on the bottom of the page */
  isBottom?: boolean,
  /** classes to apply */
  className?: string,
  /** disabled attribute (setting disabled removes onClick) */
  disabled?: boolean,
  /** optional title to display below the icon */
  title?: string,
  /** Icon name for button's icon */
  iconName: IconName,
  /** Display a notification dot */
  notification?: boolean,
  /** selected styling (can also use react-router & `activeClassName`) */
  selected?: boolean,
}

/** Very much like NavTab, but used for opening external links in a new tab/window */
export function OutsideLinkTab(props: OutsideLinkTabProps) {
  const className = cx(props.className, styles.tab, styles.no_link, {
    [styles.disabled]: props.disabled,
    [styles.bottom]: props.isBottom,
    [styles.selected]: props.selected,
  })
  return (
    <Button
      className={className}
      disabled={props.disabled}
      onClick={props.onClick}
      Component="a"
      href={props.disabled ? '' : props.to}
      target="_blank"
      rel="noopener noreferrer"
    >
      <NotificationIcon
        name={props.iconName}
        childName={props.notification ? 'circle' : null}
        className={styles.icon}
      />
      {props.title && <span className={styles.title}>{props.title}</span>}
    </Button>
  )
}
