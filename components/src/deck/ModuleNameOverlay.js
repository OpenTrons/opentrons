// @flow
import * as React from 'react'

import { getModuleDisplayName, type ModuleType } from '@opentrons/shared-data'

import styles from './Module.css'

type Props = { name: ModuleType }

// TODO (ka 2019-1-7): eventually add option to override with props
const HEIGHT = 20
const PADDING_LEFT = 4

export default function ModuleNameOverlay(props: Props) {
  const displayName = getModuleDisplayName(props.name)
  return (
    <React.Fragment>
      <rect
        className={styles.module_name_overlay}
        width="100%"
        height={HEIGHT}
      />
      <text
        className={styles.module_name_text}
        dominantBaseline="central"
        x={PADDING_LEFT}
        y={HEIGHT / 2}
      >
        {displayName}
      </text>
    </React.Fragment>
  )
}
