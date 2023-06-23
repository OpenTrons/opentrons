import * as React from 'react'

import { InstrumentInfo } from './InstrumentInfo'
import styles from './instrument.css'

import type { RobotType } from '@opentrons/shared-data'
import type { InstrumentInfoProps } from './InstrumentInfo'

export interface InstrumentGroupProps {
  robotType?: RobotType
  showMountLabel?: boolean | null | undefined
  left?: InstrumentInfoProps | null | undefined
  right?: InstrumentInfoProps | null | undefined
}

const EMPTY_INSTRUMENT_PROPS = {
  description: 'None',
  tiprackModel: 'N/A',
  isDisabled: false,
}

/**
 * Renders a left and right pipette diagram & info.
 * Takes child `InstrumentInfo` props in `right` and `left` props.
 */
export function InstrumentGroup(props: InstrumentGroupProps): JSX.Element {
  const { left, right, showMountLabel, robotType } = props

  const leftProps = left || { ...EMPTY_INSTRUMENT_PROPS, mount: 'left' }
  const rightProps = right || { ...EMPTY_INSTRUMENT_PROPS, mount: 'right' }
  return (
    <section className={styles.pipette_group}>
      <InstrumentInfo
        {...leftProps}
        showMountLabel={showMountLabel}
        robotType={robotType}
      />
      <InstrumentInfo
        {...rightProps}
        showMountLabel={showMountLabel}
        robotType={robotType}
      />
    </section>
  )
}
