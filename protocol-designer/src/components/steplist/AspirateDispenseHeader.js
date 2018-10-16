// @flow
import * as React from 'react'
import cx from 'classnames'
import {Icon, HoverTooltip} from '@opentrons/components'
import {PDListItem} from '../lists'
import styles from './StepItem.css'

type AspirateDispenseHeaderProps = {
  sourceLabwareName: ?string,
  destLabwareName: ?string,
}

function AspirateDispenseHeader (props: AspirateDispenseHeaderProps) {
  const {sourceLabwareName, destLabwareName} = props

  return (
    <React.Fragment>
      <li className={styles.aspirate_dispense}>
          <span>ASPIRATE</span>
          <span className={styles.spacer}/>
          <span>DISPENSE</span>
      </li>

      <PDListItem className={cx(styles.step_subitem_column_header, styles.emphasized_cell)}>
        <HoverTooltip tooltipComponent={<LabwareTooltipContents name={sourceLabwareName} />}>
          {(hoverTooltipHandlers) => <span {...hoverTooltipHandlers}>{sourceLabwareName}</span>}
        </HoverTooltip>
        {/* This is always a "transfer icon" (arrow pointing right) for any step: */}
        <Icon name='ot-transfer' />
        <HoverTooltip tooltipComponent={<LabwareTooltipContents name={destLabwareName} />}>
          {(hoverTooltipHandlers) => <span {...hoverTooltipHandlers}>{destLabwareName}</span>}
        </HoverTooltip>
      </PDListItem>
    </React.Fragment>
  )
}

const LabwareTooltipContents = () => (

)

export default AspirateDispenseHeader
