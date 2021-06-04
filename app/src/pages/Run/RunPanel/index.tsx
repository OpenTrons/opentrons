import * as React from 'react'
import { connect } from 'react-redux'

import {
  actions as robotActions,
  selectors as robotSelectors,
} from '../../../redux/robot'
import { getMissingModules } from '../../../redux/modules'

import { SidePanel, SidePanelGroup } from '@opentrons/components'
import { RunTimer } from './RunTimer'
import { RunControls } from './RunControls'
import { ModuleLiveStatusCards } from './ModuleLiveStatusCards'

import type { MapDispatchToProps } from 'react-redux'
import type { State } from '../../../redux/types'

interface SP {
  isRunning: boolean
  isPaused: boolean
  startTime: string | null
  isReadyToRun: boolean
  isBlocked: boolean
  modulesReady: boolean
  runTime: string
  disabled: boolean
}

interface DP {
  onRunClick: () => unknown
  onPauseClick: () => unknown
  onResumeClick: () => unknown
  onResetClick: () => unknown
}

type Props = SP & DP

const mapStateToProps = (state: State): SP => ({
  isRunning: robotSelectors.getIsRunning(state),
  isPaused: robotSelectors.getIsPaused(state),
  startTime: robotSelectors.getStartTime(state),
  isReadyToRun: robotSelectors.getIsReadyToRun(state),
  isBlocked: robotSelectors.getIsBlocked(state),
  modulesReady: getMissingModules(state).length === 0,
  runTime: robotSelectors.getRunTime(state),
  disabled:
    !robotSelectors.getSessionIsLoaded(state) ||
    robotSelectors.getCancelInProgress(state) ||
    robotSelectors.getSessionLoadInProgress(state),
})

const mapDispatchToProps: MapDispatchToProps<DP, {}> = dispatch => ({
  onRunClick: () => dispatch(robotActions.run()),
  onPauseClick: () => dispatch(robotActions.pause()),
  onResumeClick: () => dispatch(robotActions.resume()),
  onResetClick: () => dispatch(robotActions.refreshSession()),
})

function RunPanelComponent(props: Props): JSX.Element {
  return (
    <SidePanel title="Execute Run">
      <SidePanelGroup>
        <RunTimer startTime={props.startTime} runTime={props.runTime} />
        <RunControls
          disabled={props.disabled}
          modulesReady={props.modulesReady}
          isReadyToRun={props.isReadyToRun}
          isPaused={props.isPaused}
          isRunning={props.isRunning}
          isBlocked={props.isBlocked}
          onRunClick={props.onRunClick}
          onPauseClick={props.onPauseClick}
          onResumeClick={props.onResumeClick}
          onResetClick={props.onResetClick}
        />
      </SidePanelGroup>
      <ModuleLiveStatusCards />
    </SidePanel>
  )
}

export const RunPanel = connect(
  mapStateToProps,
  mapDispatchToProps
)(RunPanelComponent)
