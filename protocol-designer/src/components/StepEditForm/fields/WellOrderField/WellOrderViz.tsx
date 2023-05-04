import { WellOrderOption } from '../../../../form-types'
import PATH_IMAGE from '../../../../images/well_order_path.svg'
import WELLS_IMAGE from '../../../../images/well_order_wells.svg'
import styles from './WellOrderInput.css'
import cx from 'classnames'
import * as React from 'react'

interface Props {
  firstValue: WellOrderOption
  secondValue: WellOrderOption
}

export const WellOrderViz = (props: Props): JSX.Element => {
  const { firstValue, secondValue } = props

  return (
    <div className={styles.viz_wrapper}>
      <img src={WELLS_IMAGE} className={styles.wells_image} />
      <img
        src={PATH_IMAGE}
        className={cx(
          styles.path_image,
          styles[`${firstValue || ''}_first`],
          styles[`${secondValue || ''}_second`]
        )}
      />
    </div>
  )
}
