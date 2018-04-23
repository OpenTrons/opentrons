// @flow
// attached pipettes container card
import * as React from 'react'
import {connect} from 'react-redux'

import type {State} from '../../types'
import type {Robot} from '../../robot'
import type {Pipette} from '../../http-api-client'
import {makeGetRobotPipettes, fetchPipettes, clearRobotMoveResponse} from '../../http-api-client'

import InstrumentInfo from './InstrumentInfo'
import {RefreshCard} from '@opentrons/components'

type OP = Robot

type SP = {
  inProgress: boolean,
  left: ?Pipette,
  right: ?Pipette,
}

type DP = {
  fetchPipettes: () => mixed,
  clearMove: () => mixed,
}

type Props = OP & SP & DP

const TITLE = 'Pipettes'

export default connect(
  makeMapStateToProps,
  mapDispatchToProps
)(AttachedInstrumentsCard)

function AttachedInstrumentsCard (props: Props) {
  return (
    <RefreshCard
      title={TITLE}
      watch={props.name}
      refresh={props.fetchPipettes}
      refreshing={props.inProgress}
    >
      <InstrumentInfo mount='left' name={props.name} {...props.left} onClick={props.clearMove} />
      <InstrumentInfo mount='right' name={props.name} {...props.right} onClick={props.clearMove} />
    </RefreshCard>
  )
}

function makeMapStateToProps (): (state: State, ownProps: OP) => SP {
  const getRobotPipettes = makeGetRobotPipettes()

  return (state, ownProps) => {
    const {inProgress, response} = getRobotPipettes(state, ownProps)
    const {left, right} = response || {left: null, right: null}

    return {inProgress, left, right}
  }
}

function mapDispatchToProps (dispatch: Dispatch, ownProps: OP): DP {
  return {
    fetchPipettes: () => dispatch(fetchPipettes(ownProps)),
    clearMove: () => dispatch(clearRobotMoveResponse(ownProps))
  }
}
