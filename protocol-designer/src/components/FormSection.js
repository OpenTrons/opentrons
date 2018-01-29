// @flow
import * as React from 'react'
import cx from 'classnames'
import {Icon} from '@opentrons/components'

import styles from './FormSection.css'

type Props = {
  title?: string,
  children?: React.Node,
  className?: string,
  /** if defined, carat shows */
  onCollapseToggle?: (event: SyntheticEvent<>) => void,
  collapsed?: boolean
}

export default function FormSection (props: Props) {
  return (
    <div className={cx(styles.form_section, props.className)}>
      <div className={styles.title}>{props.title}</div>

      <div className={styles.content}>
        {props.collapsed !== true && props.children}
      </div>

      {props.onCollapseToggle &&
        <div onClick={props.onCollapseToggle}>
          {/* TODO Ian 2018-01-29 use an IconButton once it exists */}
          <Icon
            width='30px'
            name={props.collapsed === true ? 'chevron up' : 'chevron down'}
            className={styles.carat}
          />
        </div>
      }
    </div>
  )
}
