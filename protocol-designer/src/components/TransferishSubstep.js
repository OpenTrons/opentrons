// @flow
import * as React from 'react'
import cx from 'classnames'
import last from 'lodash/last'
import {Icon} from '@opentrons/components'

import styles from './StepItem.css'

import type {
  TransferishStepItem,
  StepItemSourceDestRowMulti,
  SubstepIdentifier
} from '../steplist/types'

export type StepSubItemProps = {|
  substeps: TransferishStepItem
|}

type MultiChannelSubstepProps = {|
  volume: ?string,
  rowGroup: Array<StepItemSourceDestRowMulti>,
  sourceIngredientName: ?string,
  destIngredientName: ?string,
  highlighted?: boolean,
  onMouseEnter?: (e: SyntheticMouseEvent<*>) => mixed,
  onMouseLeave?: (e: SyntheticMouseEvent<*>) => mixed
|}

const VOLUME_DIGITS = 1
const DEFAULT_COLLAPSED_STATE = true

class MultiChannelSubstep extends React.Component<MultiChannelSubstepProps, {collapsed: boolean}> {
  constructor (props: MultiChannelSubstepProps) {
    super(props)
    this.state = {
      collapsed: DEFAULT_COLLAPSED_STATE
    }
  }

  handleToggleCollapsed = () => {
    this.setState({
      ...this.state,
      collapsed: !this.state.collapsed
    })
  }

  render () {
    const {
      volume,
      rowGroup,
      highlighted,
      sourceIngredientName
      // destIngredientName
    } = this.props

    const lastGroupSourceWell = last(rowGroup).sourceWell
    const sourceWellRange = (rowGroup[0].sourceWell && lastGroupSourceWell)
      ? `${rowGroup[0].sourceWell}:${lastGroupSourceWell}`
      : ''

    const lastGroupDestWell = last(rowGroup).destWell
    const destWellRange = (rowGroup[0].destWell && lastGroupDestWell)
      ? `${rowGroup[0].destWell}:${lastGroupDestWell}`
      : ''

    const collapsed = this.state.collapsed

    return (
      <ol
        onMouseEnter={this.props.onMouseEnter}
        onMouseLeave={this.props.onMouseLeave}
        className={cx(styles.substep, {[styles.highlighted]: highlighted})}
      >
        {/* TODO special class for this substep subheader thing?? */}
        <li className={styles.step_subitem}>
          <span>{sourceIngredientName}</span>
          <span className={styles.emphasized_cell}>{sourceWellRange}</span>
          <span className={styles.volume_cell}>{volume && `${volume} μL`}</span>
          <span className={styles.emphasized_cell}>{destWellRange}</span>
          {/* <span>{destIngredientName}</span> */}
          <span className={styles.inner_carat} onClick={() => this.handleToggleCollapsed()}>
            <Icon name={collapsed ? 'chevron-down' : 'chevron-up'} />
          </span>
        </li>

        {!collapsed && rowGroup.map((row, rowKey) =>
          // Channel rows (1 for each channel in multi-channel pipette)
          <li className={styles.step_subitem_channel_row} key={rowKey}>
            <span>{row.sourceIngredientName}</span>
            <span className={styles.emphasized_cell}>{row.sourceWell}</span>
            <span className={styles.volume_cell}>{volume && `${volume} μL`}</span>
            <span className={styles.emphasized_cell}>{row.destWell}</span>
            <span>{row.destIngredientName}</span>
          </li>
      )}
      </ol>
    )
  }
}

type TransferishSubstepProps = {|
  ...StepSubItemProps,
  onSelectSubstep: SubstepIdentifier => mixed,
  hoveredSubstep: SubstepIdentifier
|}

// This "transferish" substep component is for transfer/distribute/consolidate
export default function TransferishSubstep (props: TransferishSubstepProps) {
  const {substeps, onSelectSubstep, hoveredSubstep} = props
  if (substeps.multichannel) {
    // multi-channel row item (collapsible)
    return <li>
      {substeps.multiRows.map((rowGroup, groupKey) =>
        <MultiChannelSubstep
          key={groupKey}
          rowGroup={rowGroup}
          volume={typeof substeps.volume === 'number'
            ? substeps.volume.toFixed(VOLUME_DIGITS)
            : null
          }
          onMouseEnter={() => onSelectSubstep({
            stepId: substeps.parentStepId,
            substepId: groupKey
          })}
          onMouseLeave={() => onSelectSubstep(null)}
          // TODO LATER Ian 2018-04-06 ingredient name & color passed in from store
          sourceIngredientName='ING11'
          destIngredientName='ING12'
          highlighted={!!hoveredSubstep &&
            hoveredSubstep.stepId === substeps.parentStepId &&
            hoveredSubstep.substepId === groupKey
          }
        />
      )}
    </li>
  }

  // single-channel row item
  return substeps.rows.map((row, substepId) =>
    <li key={substepId}
      className={cx(
        styles.step_subitem,
        {[styles.highlighted]:
          !!hoveredSubstep &&
          hoveredSubstep.stepId === substeps.parentStepId &&
          substepId === hoveredSubstep.substepId
        }
      )}
      onMouseEnter={() => onSelectSubstep({
        stepId: substeps.parentStepId,
        substepId
      })}
      onMouseLeave={() => onSelectSubstep(null)}
    >
      <span>{row.sourceIngredientName}</span>
      <span className={styles.emphasized_cell}>{row.sourceWell}</span>
      <span className={styles.volume_cell}>{
        typeof row.volume === 'number' &&
        `${parseFloat(row.volume.toFixed(VOLUME_DIGITS))} μL`
      }</span>
      <span className={styles.emphasized_cell}>{row.destWell}</span>
      <span>{row.destIngredientName}</span>
    </li>
  )
}
