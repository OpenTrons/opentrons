// @flow
// "Robot Controls" card
import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { push } from 'connected-react-router'
import { Link } from 'react-router-dom'

import { startDeckCalibration } from '../../http-api-client'
import { getConfig } from '../../config'

import {
  home,
  fetchLights,
  updateLights,
  getLightsOn,
  ROBOT,
} from '../../robot-controls'
import { restartRobot } from '../../robot-admin'
import { selectors as robotSelectors } from '../../robot'
import { CONNECTABLE } from '../../discovery'

import { Card, LabeledToggle, LabeledButton } from '@opentrons/components'

import type { State, Dispatch } from '../../types'
import type { ViewableRobot } from '../../discovery/types'

type Props = {|
  robot: ViewableRobot,
  calibrateDeckUrl: string,
  checkDeckUrl: string,
|}

const TITLE = 'Robot Controls'

const CALIBRATE_DECK_DESCRIPTION =
  "Calibrate the position of the robot's deck. Recommended for all new robots and after moving robots."

const CHECK_DECK_CAL_DESCRIPTION = "Check the robot's deck calibration"

export function ControlsCard(props: Props) {
  const dispatch = useDispatch<Dispatch>()
  const { robot, calibrateDeckUrl, checkDeckUrl } = props
  const { name: robotName, status } = robot
  const config = useSelector(getConfig)
  const enableRobotCalCheck = Boolean(config.devInternal?.enableRobotCalCheck)
  const lightsOn = useSelector((state: State) => getLightsOn(state, robotName))
  const isRunning = useSelector(robotSelectors.getIsRunning)
  const notConnectable = status !== CONNECTABLE
  const toggleLights = () => dispatch(updateLights(robotName, !lightsOn))
  const canControl = robot.connected && !isRunning

  const startCalibration = () => {
    dispatch(startDeckCalibration(robot)).then(() =>
      dispatch(push(calibrateDeckUrl))
    )
  }

  React.useEffect(() => {
    dispatch(fetchLights(robotName))
  }, [dispatch, robotName])

  const buttonDisabled = notConnectable || !canControl

  return (
    <Card title={TITLE} disabled={notConnectable}>
      {enableRobotCalCheck && (
        <LabeledButton
          label="Check deck calibration"
          buttonProps={{
            disabled: buttonDisabled,
            children: 'Check',
            Component: Link,
            to: checkDeckUrl,
          }}
        >
          <p>{CHECK_DECK_CAL_DESCRIPTION}</p>
        </LabeledButton>
      )}
      <LabeledButton
        label="Calibrate deck"
        buttonProps={{
          onClick: startCalibration,
          disabled: buttonDisabled,
          children: 'Calibrate',
        }}
      >
        <p>{CALIBRATE_DECK_DESCRIPTION}</p>
      </LabeledButton>
      <LabeledButton
        label="Home all axes"
        buttonProps={{
          onClick: () => dispatch(home(robotName, ROBOT)),
          disabled: buttonDisabled,
          children: 'Home',
        }}
      >
        <p>Return robot to starting position.</p>
      </LabeledButton>
      <LabeledButton
        label="Restart robot"
        buttonProps={{
          onClick: () => dispatch(restartRobot(robotName)),
          disabled: buttonDisabled,
          children: 'Restart',
        }}
      >
        <p>Restart robot.</p>
      </LabeledButton>
      <LabeledToggle
        label="Lights"
        toggledOn={Boolean(lightsOn)}
        onClick={toggleLights}
      >
        <p>Control lights on deck.</p>
      </LabeledToggle>
    </Card>
  )
}
