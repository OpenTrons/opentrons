// @flow
import * as React from 'react'
import { useSelector } from 'react-redux'
import * as RobotApi from '../../robot-api'
import * as Sessions from '../../sessions'
import * as Config from '../../config'

import {
  Icon,
  SecondaryBtn,
  BORDER_SOLID_LIGHT,
  Tooltip,
  useHoverTooltip,
  SpinnerModalPage,
} from '@opentrons/components'

import { Portal } from '../portal'
import { CheckHealthCalibration } from '../CheckCalibration'
import { TitledControl } from '../TitledControl'
import { AskForCalibrationBlockModal } from '../../components/CalibrateTipLength/AskForCalibrationBlockModal'

import type { SessionCommandString } from '../../sessions/types'
import type { RequestState } from '../../robot-api/types'

import type { State } from '../../types'

export type CheckCalibrationControlProps = {|
  robotName: string,
  disabledReason: string | null,
|}

const CAL_HEALTH_CHECK = 'Calibration Health Check'
const CHECK_HEALTH = 'check health'
const CAL_HEALTH_CHECK_DESCRIPTION =
  'Check the calibration settings for your robot.'
const EXIT = 'exit'

// pipette calibration commands for which the full page spinner should not appear
const spinnerCommandBlockList: Array<SessionCommandString> = [
  Sessions.sharedCalCommands.JOG,
]

export function CheckCalibrationControl({
  robotName,
  disabledReason,
}: CheckCalibrationControlProps): React.Node {
  const [showWizard, setShowWizard] = React.useState(false)
  const [targetProps, tooltipProps] = useHoverTooltip()

  const trackedRequestId = React.useRef<string | null>(null)
  const deleteRequestId = React.useRef<string | null>(null)
  const createRequestId = React.useRef<string | null>(null)
  const jogRequestId = React.useRef<string | null>(null)

  const [dispatchRequests] = RobotApi.useDispatchApiRequests(
    dispatchedAction => {
      if (dispatchedAction.type === Sessions.ENSURE_SESSION) {
        createRequestId.current = dispatchedAction.meta.requestId
      } else if (
        dispatchedAction.type === Sessions.DELETE_SESSION &&
        checkHealthSession?.id === dispatchedAction.payload.sessionId
      ) {
        deleteRequestId.current = dispatchedAction.meta.requestId
      } else if (
        dispatchedAction.type === Sessions.CREATE_SESSION_COMMAND &&
        dispatchedAction.payload.command.command ===
          Sessions.sharedCalCommands.JOG
      ) {
        jogRequestId.current = dispatchedAction.meta.requestId
      } else if (
        dispatchedAction.type !== Sessions.CREATE_SESSION_COMMAND ||
        !spinnerCommandBlockList.includes(
          dispatchedAction.payload.command.command
        )
      ) {
        trackedRequestId.current = dispatchedAction.meta.requestId
      }
    }
  )

  const startingSession =
    useSelector<State, RequestState | null>(state =>
      createRequestId.current
        ? RobotApi.getRequestById(state, createRequestId.current)
        : null
    )?.status === RobotApi.PENDING

  const showSpinner =
    useSelector<State, RequestState | null>(state =>
      trackedRequestId.current
        ? RobotApi.getRequestById(state, trackedRequestId.current)
        : null
    )?.status === RobotApi.PENDING

  const isJogging =
    useSelector((state: State) =>
      jogRequestId.current
        ? RobotApi.getRequestById(state, jogRequestId.current)
        : null
    )?.status === RobotApi.PENDING

  const shouldClose =
    useSelector<State, RequestState | null>(state =>
      deleteRequestId.current
        ? RobotApi.getRequestById(state, deleteRequestId.current)
        : null
    )?.status === RobotApi.SUCCESS

  const shouldOpen =
    useSelector((state: State) =>
      createRequestId.current
        ? RobotApi.getRequestById(state, createRequestId.current)
        : null
    )?.status === RobotApi.SUCCESS

  React.useEffect(() => {
    if (shouldOpen) {
      setShowWizard(true)
      createRequestId.current = null
    }
    if (shouldClose) {
      setShowWizard(false)
      deleteRequestId.current = null
    }
  }, [shouldOpen, shouldClose])

  const configHasCalibrationBlock = useSelector(Config.getHasCalibrationBlock)
  const [showCalBlockModal, setShowCalBlockModal] = React.useState(false)

  const handleStart = (hasBlockModalResponse: boolean | null = null) => {
    if (hasBlockModalResponse === null && configHasCalibrationBlock === null) {
      setShowCalBlockModal(true)
    } else {
      setShowCalBlockModal(false)
      dispatchRequests(
        Sessions.ensureSession(
          robotName,
          Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK,
          {
            tipRacks: [],
            hasCalibrationBlock: Boolean(
              configHasCalibrationBlock ?? hasBlockModalResponse
            ),
          }
        )
      )
    }
  }

  const checkHealthSession = useSelector((state: State) => {
    const session: Sessions.Session | null = Sessions.getRobotSessionOfType(
      state,
      robotName,
      Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK
    )
    if (
      session &&
      session.sessionType === Sessions.SESSION_TYPE_CALIBRATION_HEALTH_CHECK
    ) {
      return session
    }
    return null
  })

  const buttonDisabled = Boolean(disabledReason) || showSpinner

  const buttonChildren = showSpinner ? (
    <Icon name="ot-spinner" height="1em" spin />
  ) : (
    CHECK_HEALTH
  )

  return (
    <>
      <TitledControl
        borderBottom={BORDER_SOLID_LIGHT}
        title={CAL_HEALTH_CHECK}
        description={CAL_HEALTH_CHECK_DESCRIPTION}
        control={
          <SecondaryBtn
            {...targetProps}
            width="12rem"
            onClick={() => handleStart(null)} // passing in null because we want to show the AskForBlock modal
            disabled={buttonDisabled}
          >
            {buttonChildren}
          </SecondaryBtn>
        }
      >
        {disabledReason !== null && (
          <Tooltip {...tooltipProps}>{disabledReason}</Tooltip>
        )}
      </TitledControl>
      <Portal level="top">
        {showCalBlockModal ? (
          <AskForCalibrationBlockModal
            onResponse={handleStart}
            titleBarTitle={CAL_HEALTH_CHECK}
            closePrompt={() => setShowCalBlockModal(false)}
          />
        ) : null}
        {startingSession ? (
          <SpinnerModalPage
            titleBar={{
              title: CAL_HEALTH_CHECK,
              back: {
                disabled: true,
                title: EXIT,
                children: EXIT,
              },
            }}
          />
        ) : null}
        {showWizard && (
          <CheckHealthCalibration
            session={checkHealthSession}
            robotName={robotName}
            dispatchRequests={dispatchRequests}
            showSpinner={showSpinner}
            isJogging={isJogging}
          />
        )}
      </Portal>
    </>
  )
}
