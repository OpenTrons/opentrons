import * as React from 'react'
import cx from 'classnames'

import { Icon } from '@opentrons/components'
import styles from './styles.css'
import type { IconName } from '@opentrons/components'

export interface IconCtaProps {
  name: string
  iconName: IconName
  text: string
  className?: string
  onClick: () => unknown
}

export const IconCta = ({
  name,
  iconName,
  text,
  className,
  onClick,
}: IconCtaProps): JSX.Element => (
  <button
    name={name}
    onClick={onClick}
    className={cx(styles.icon_cta, className)}
    type="button"
  >
    <Icon name={iconName} className={styles.icon_cta_icon} />
    <span>{text}</span>
  </button>
)
