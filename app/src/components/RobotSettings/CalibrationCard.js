// @flow
// calibration panel with various calibration-related controls and info

import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'

import type { Dispatch, State } from '../../types'
import * as Calibration from '../../calibration'
import * as PipetteOffset from '../../calibration/pipette-offset'
import * as Pipettes from '../../pipettes'
import { CONNECTABLE } from '../../discovery'
import type { ViewableRobot } from '../../discovery/types'
import { selectors as robotSelectors } from '../../robot'

import { useInterval, Card } from '@opentrons/components'

import {
  DECK_CAL_STATUS_POLL_INTERVAL,
  DISABLED_CANNOT_CONNECT,
  DISABLED_CONNECT_TO_ROBOT,
  DISABLED_PROTOCOL_IS_RUNNING,
} from './constants'
import { DeckCalibrationControl } from './DeckCalibrationControl'
import { CheckCalibrationControl } from './CheckCalibrationControl'
import { CalibrationCardWarning } from './CalibrationCardWarning'
import { PipetteOffsets } from './PipetteOffsets'

type Props = {|
  robot: ViewableRobot,
  pipettesPageUrl: string,
|}

const TITLE = 'Robot Calibration'

export function CalibrationCard(props: Props): React.Node {
  const { robot, pipettesPageUrl } = props
  const { name: robotName, status } = robot
  const notConnectable = status !== CONNECTABLE

  const dispatch = useDispatch<Dispatch>()

  // Poll deck cal status data
  useInterval(
    () => dispatch(Calibration.fetchCalibrationStatus(robotName)),
    DECK_CAL_STATUS_POLL_INTERVAL,
    true
  )

  // Fetch pipette cal (and pipettes) whenever we view a different
  // robot or the robot becomes connectable
  React.useEffect(() => {
    robotName && dispatch(Pipettes.fetchPipettes(robotName))
    robotName &&
      dispatch(PipetteOffset.fetchPipetteOffsetCalibrations(robotName))
  }, [dispatch, robotName, status])

  const isRunning = useSelector(robotSelectors.getIsRunning)
  const deckCalStatus = useSelector((state: State) => {
    return Calibration.getDeckCalibrationStatus(state, robotName)
  })
  const deckCalData = useSelector((state: State) => {
    return Calibration.getDeckCalibrationData(state, robotName)
  })

  let buttonDisabledReason = null
  if (notConnectable) {
    buttonDisabledReason = DISABLED_CANNOT_CONNECT
  } else if (!robot.connected) {
    buttonDisabledReason = DISABLED_CONNECT_TO_ROBOT
  } else if (isRunning) {
    buttonDisabledReason = DISABLED_PROTOCOL_IS_RUNNING
  }

  const warningInsteadOfCalcheck = [
    Calibration.DECK_CAL_STATUS_SINGULARITY,
    Calibration.DECK_CAL_STATUS_BAD_CALIBRATION,
    Calibration.DECK_CAL_STATUS_IDENTITY,
  ].includes(deckCalStatus)

  return (
    <Card title={TITLE}>
      {warningInsteadOfCalcheck ? (
        <CalibrationCardWarning />
      ) : (
        <CheckCalibrationControl
          robotName={robotName}
          disabledReason={buttonDisabledReason}
        />
      )}

      <DeckCalibrationControl
        robotName={robotName}
        disabledReason={buttonDisabledReason}
        deckCalStatus={deckCalStatus}
        deckCalData={deckCalData}
      />
      <PipetteOffsets pipettesPageUrl={pipettesPageUrl} robot={robot} />
    </Card>
  )
}
