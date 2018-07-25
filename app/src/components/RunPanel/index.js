// @flow
import * as React from 'react'
import {connect} from 'react-redux'

import {
  actions as robotActions,
  selectors as robotSelectors
} from '../../robot'
import {getModulesOn} from '../../config'
import {SidePanel, SidePanelGroup} from '@opentrons/components'
import RunTimer from './RunTimer'
import RunControls from './RunControls'
import TempdeckStatusCard from '../TempdeckStatusCard'

const mapStateToProps = (state) => ({
  modulesFlag: getModulesOn(state),
  isRunning: robotSelectors.getIsRunning(state),
  isPaused: robotSelectors.getIsPaused(state),
  startTime: robotSelectors.getStartTime(state),
  isReadyToRun: robotSelectors.getIsReadyToRun(state),
  runTime: robotSelectors.getRunTime(state),
  disabled: (
    !robotSelectors.getSessionIsLoaded(state) ||
    robotSelectors.getCancelInProgress(state) ||
    robotSelectors.getSessionLoadInProgress(state)
  )
})

const mapDispatchToProps = (dispatch) => ({
  onRunClick: () => dispatch(robotActions.run()),
  onPauseClick: () => dispatch(robotActions.pause()),
  onResumeClick: () => dispatch(robotActions.resume()),
  onResetClick: () => dispatch(robotActions.refreshSession())
})

function RunPanel (props) {
  return (
    <SidePanel title='Execute Run'>
        <SidePanelGroup>
          <RunTimer startTime={props.startTime} runTime={props.runTime} />
          <RunControls {...props} />
        </SidePanelGroup>
        {props.modulesFlag && (
          <TempdeckStatusCard />
        )}
    </SidePanel>
  )
}

export default connect(mapStateToProps, mapDispatchToProps)(RunPanel)
