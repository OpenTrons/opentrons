// @flow
import * as React from 'react'
import { connect } from 'react-redux'

import { push } from 'connected-react-router'

import { makeGetRobotUpdateInfo } from '../../../http-api-client'

import { getRobotApiVersion } from '../../../discovery'

import { CURRENT_VERSION, setBuildrootUpdateSeen } from '../../../shell'

import UpdateAppModal from './UpdateAppModal'
import SyncRobotModal from './SyncRobotModal'
import ReinstallModal from './ReinstallModal'

import type { State, Dispatch } from '../../../types'
import type { ShellUpdateState } from '../../../shell'
import type { ViewableRobot } from '../../../discovery'
import type { RobotUpdateInfo } from '../../../http-api-client'

type OP = {|
  robot: ViewableRobot,
  parentUrl: string,
  appUpdate: ShellUpdateState,
  setCurrentStep: (step: string) => mixed,
|}

type SP = {|
  appVersion: string,
  robotVersion: string,
  robotUpdateInfo: RobotUpdateInfo,
|}

type DP = {| dispatch: Dispatch |}

type Props = {
  ...OP,
  ...SP,
  ignoreUpdate: () => mixed,
}

function UpdateRobotModal(props: Props) {
  const {
    parentUrl,
    appVersion,
    robotVersion,
    robotUpdateInfo,
    appUpdate: { available: appUpdateAvailable, info: appUpdateInfo },
    setCurrentStep,
  } = props
  const appUpdateVersion = appUpdateInfo && appUpdateInfo.version
  const robotUpdateVersion = robotUpdateInfo.version
  const availableUpdate = appUpdateVersion || robotUpdateVersion
  const versionProps = { appVersion, robotVersion, availableUpdate }
  const proceed = () => setCurrentStep('viewUpdateInfo')

  if (appUpdateAvailable) {
    return (
      <UpdateAppModal
        updateInfo={robotUpdateInfo}
        parentUrl={parentUrl}
        onClick={proceed}
        versionProps={versionProps}
        ignoreUpdate={props.ignoreUpdate}
      />
    )
  } else if (robotUpdateInfo.type) {
    return (
      <SyncRobotModal
        updateInfo={robotUpdateInfo}
        parentUrl={parentUrl}
        versionProps={versionProps}
        proceed={proceed}
        ignoreUpdate={props.ignoreUpdate}
      />
    )
  } else {
    return (
      <ReinstallModal
        {...props}
        proceed={proceed}
        versionProps={versionProps}
      />
    )
  }
}

function makeMapStateToProps(): (State, OP) => SP {
  const getRobotUpdateInfo = makeGetRobotUpdateInfo()

  return (state, ownProps) => ({
    appVersion: CURRENT_VERSION,
    robotVersion: getRobotApiVersion(ownProps.robot) || 'Unknown',
    robotUpdateInfo: getRobotUpdateInfo(state, ownProps.robot),
  })
}

function mergeProps(stateProps: SP, dispatchProps: DP, ownProps: OP): Props {
  const { parentUrl } = ownProps
  const { robotUpdateInfo } = stateProps
  const { dispatch } = dispatchProps
  const close = () => dispatch(push(parentUrl))
  let ignoreUpdate = robotUpdateInfo.type
    ? () => {
        dispatch(setBuildrootUpdateSeen())
        close()
      }
    : close

  return {
    ...ownProps,
    ...stateProps,
    ignoreUpdate,
  }
}

export default connect<Props, OP, SP, {||}, State, Dispatch>(
  makeMapStateToProps,
  null,
  mergeProps
)(UpdateRobotModal)
