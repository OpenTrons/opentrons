// TitledList component
import * as React from 'react'
import cx from 'classnames'

import styles from './lists.css'
import { Icon } from '../icons'
import type { IconName, IconProps } from '../icons'

export interface TitledListProps {
  /** id attribute */
  id?: string
  /** text of title */
  title: string
  /** optional icon left of the title */
  iconName?: IconName | null | undefined
  /** props passed down to icon (`className` and `name` are ignored) */
  iconProps?: Omit<IconProps, 'name'>
  /** optional data test id for the container */
  'data-test'?: string
  // TODO(mc, 2018-01-25): enforce <li> children requirement with flow
  /** children must all be `<li>` */
  children?: React.ReactNode
  /** additional classnames */
  className?: string
  /** component with descriptive text about the list */
  description?: React.ReactNode
  /** optional click action (on title div, not children) */
  onClick?: (event: React.MouseEvent) => unknown
  /** optional right click action (on wrapping div) */
  onContextMenu?: (event: React.MouseEvent) => unknown
  /** optional mouseEnter action */
  onMouseEnter?: (event: React.MouseEvent) => unknown
  /** optional mouseLeave action */
  onMouseLeave?: (event: React.MouseEvent) => unknown
  /** caret click action; if defined, list is expandable and carat is visible */
  onCollapseToggle?: (event: React.MouseEvent) => unknown
  /** collapse the list if true (false by default) */
  collapsed?: boolean
  /** set to true when TitledList is selected (eg, user clicked it) */
  selected?: boolean
  /** set to true when TitledList is hovered (but not when its contents are hovered) */
  hovered?: boolean
  /** disables the whole TitledList if true */
  disabled?: boolean
  /** appear disabled, but preserve collapsibility */
  inert?: boolean
}

/**
 * An ordered list with optional title, icon, and description.
 */
export function TitledList(props: TitledListProps): JSX.Element {
  const {
    id,
    iconName,
    disabled,
    inert,
    'data-test': dataTest,
    onCollapseToggle,
    iconProps,
    onMouseEnter,
    onMouseLeave,
    onContextMenu,
  } = props
  const collapsible = onCollapseToggle != null

  const onClick = !disabled ? props.onClick : undefined

  // clicking on the carat will not call props.onClick,
  // so prevent bubbling up if there is an onCollapseToggle fn
  const handleCollapseToggle = (e: React.MouseEvent): void => {
    if (onCollapseToggle && !disabled) {
      e.stopPropagation()
      onCollapseToggle(e)
    }
  }

  const hasValidChildren = React.Children.toArray(props.children).some(
    child => child
  )

  const className = cx(styles.titled_list, props.className, {
    [styles.disabled]: disabled || inert,
    [styles.titled_list_selected]: !disabled && props.selected,
    [styles.hover_border]: !disabled && props.hovered,
  })

  const titleBarClass = cx(styles.title_bar, {
    [styles.clickable]: props.onClick,
  })

  const iconClass = cx(
    styles.title_bar_icon,
    styles.icon_left_of_title,
    iconProps && iconProps.className
  )

  return (
    <div
      id={id}
      className={className}
      data-test={dataTest}
      {...{ onMouseEnter, onMouseLeave, onContextMenu }}
    >
      <div onClick={onClick} className={titleBarClass}>
        {iconName && (
          <Icon {...iconProps} className={iconClass} name={iconName} />
        )}
        <h3
          className={cx(styles.title, {
            [styles.title_enabled]: !(disabled || inert),
            [styles.title_disabled]: disabled || inert,
          })}
        >
          {props.title}
        </h3>
        {collapsible && (
          <div
            onClick={handleCollapseToggle}
            className={styles.title_bar_carat}
          >
            <Icon
              className={styles.title_bar_icon}
              name={
                props.selected
                  ? 'chevron-right'
                  : props.collapsed
                  ? 'chevron-down'
                  : 'chevron-up'
              }
            />
          </div>
        )}
      </div>
      {!props.collapsed && props.description}
      {!props.collapsed && hasValidChildren && (
        <ol className={styles.list}>{props.children}</ol>
      )}
    </div>
  )
}
