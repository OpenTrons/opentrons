// TODO(mc, 2020-02-19): no longer used; remove
import * as React from 'react'

import { getModuleDisplayName } from '@opentrons/shared-data'

import styles from './Module.css'

import type { ModuleModel } from '@opentrons/shared-data'

export interface ModuleNameOverlayProps {
  name: ModuleModel
}

// TODO (ka 2019-1-7): eventually add option to override with props
const HEIGHT = 20
const PADDING_LEFT = 4

/**
 * @deprecated No longer necessary, do not use
 */
export function ModuleNameOverlay(props: ModuleNameOverlayProps): JSX.Element {
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
