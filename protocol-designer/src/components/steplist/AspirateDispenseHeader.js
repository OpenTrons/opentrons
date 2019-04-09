// @flow
import * as React from 'react'
import cx from 'classnames'
import { Icon, HoverTooltip } from '@opentrons/components'
import { PDListItem } from '../lists'
import styles from './StepItem.css'
import LabwareTooltipContents from './LabwareTooltipContents'
import { Portal } from './TooltipPortal'

type AspirateDispenseHeaderProps = {
  sourceLabwareNickname: ?string,
  sourceLabwareType: ?string,
  destLabwareNickname: ?string,
  destLabwareType: ?string,
}

function AspirateDispenseHeader(props: AspirateDispenseHeaderProps) {
  const {
    sourceLabwareNickname,
    sourceLabwareType,
    destLabwareNickname,
    destLabwareType,
  } = props

  return (
    <React.Fragment>
      <li className={styles.aspirate_dispense}>
        <span>ASPIRATE</span>
        <span className={styles.spacer} />
        <span>DISPENSE</span>
      </li>

      <PDListItem
        className={cx(
          styles.step_subitem_column_header,
          styles.emphasized_cell
        )}
      >
        <HoverTooltip
          portal={Portal}
          tooltipComponent={
            <LabwareTooltipContents
              labwareNickname={sourceLabwareNickname}
              labwareType={sourceLabwareType}
            />
          }
        >
          {hoverTooltipHandlers => (
            <span
              {...hoverTooltipHandlers}
              className={styles.labware_display_name}
            >
              {sourceLabwareNickname}
            </span>
          )}
        </HoverTooltip>
        {/* This is always a "transfer icon" (arrow pointing right) for any step: */}
        <Icon name="ot-transfer" />
        <HoverTooltip
          portal={Portal}
          tooltipComponent={
            <LabwareTooltipContents
              labwareNickname={destLabwareNickname}
              labwareType={destLabwareType}
            />
          }
        >
          {hoverTooltipHandlers => (
            <span
              {...hoverTooltipHandlers}
              className={styles.labware_display_name}
            >
              {destLabwareNickname}
            </span>
          )}
        </HoverTooltip>
      </PDListItem>
    </React.Fragment>
  )
}

export default AspirateDispenseHeader
