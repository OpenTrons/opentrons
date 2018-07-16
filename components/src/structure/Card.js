// @flow
// Card component with drop shadow

import * as React from 'react'
import cx from 'classnames'

import styles from './structure.css'

type Props = {
  /** Title for card */
  title: React.Node,
  /** Optional description or message for card */
  description?: string,
  /** Card content, displays in a flex-row by default */
  children: React.Node,
  /** Displays card content in a flex-column */
  column?: boolean,
  /** If card can not be used, gray it out and remove pointer events */
  disabled?: boolean,
  /** Override children's className with this class, if given */
  contentClassNameOverride?: ?string,
  /** Additional class names */
  className?: string
}

export default function Card (props: Props) {
  const {title, column, children, contentClassNameOverride} = props

  const className = cx(styles.card, props.className, {
    [styles.disabled]: props.disabled
  })
  const contentClassName = contentClassNameOverride !== undefined
    ? contentClassNameOverride
    : cx(styles.card_content, {
      [styles.card_column]: column
    })

  return (
    <section className={className}>
      <h3 className={styles.card_title}>{title}</h3>
      {props.description &&
        (<p
          className={styles.card_description}
          >
          {props.description}
        </p>)
      }
      <div className={contentClassName}>
        {children}
      </div>
    </section>
  )
}
