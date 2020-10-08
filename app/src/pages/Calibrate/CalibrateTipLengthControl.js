// @flow
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import {
  Icon,
  PrimaryButton,
  type Mount,
  useConditionalConfirm,
} from '@opentrons/components'
import * as RobotApi from '../../robot-api'
import * as Sessions from '../../sessions'

import { getUseTrashSurfaceForTipCal } from '../../config'
import { setUseTrashSurfaceForTipCal } from '../../calibration'

import {
  CalibrateTipLength,
  AskForCalibrationBlockModal,
  ConfirmRecalibrationModal,
} from '../../components/CalibrateTipLength'

import { CalibrationInfoBox } from '../../components/CalibrationInfoBox'
import { CalibrationInfoContent } from '../../components/CalibrationInfoContent'
import { Portal } from '../../components/portal'
import { CalibratePipetteOffset } from '../../components/CalibratePipetteOffset'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { State, Dispatch } from '../../types'
import type { SessionCommandString } from '../../sessions/types'
import type { RequestState } from '../../robot-api/types'

export type CalibrateTipLengthControlProps = {|
  robotName: string,
  hasCalibrated: boolean,
  mount: Mount,
  tipRackDefinition: LabwareDefinition2,
  isExtendedPipOffset: boolean,
|}

// tip length calibration commands for which the full page spinner should not appear
const spinnerCommandBlockList: Array<SessionCommandString> = [
  Sessions.sharedCalCommands.JOG,
]

const IS_CALIBRATED = 'Pipette tip height is calibrated'
const IS_NOT_CALIBRATED = 'Pipette tip height is not calibrated'
const CALIBRATE_TIP_LENGTH = 'Calibrate tip length'
const RECALIBRATE_TIP_LENGTH = 'Re-Calibrate tip length'

export function CalibrateTipLengthControl({
  robotName,
  hasCalibrated,
  mount,
  tipRackDefinition,
  isExtendedPipOffset,
}: CalibrateTipLengthControlProps): React.Node {
  const [showWizard, setShowWizard] = React.useState(false)
  const [showCalBlockPrompt, setShowCalBlockPrompt] = React.useState(false)
  const dispatch = useDispatch<Dispatch>()

  const trackedRequestId = React.useRef<string | null>(null)
  const deleteRequestId = React.useRef<string | null>(null)
  const createRequestId = React.useRef<string | null>(null)

  const [dispatchRequests] = RobotApi.useDispatchApiRequests(
    dispatchedAction => {
      if (dispatchedAction.type === Sessions.ENSURE_SESSION) {
        createRequestId.current = dispatchedAction.meta.requestId
      } else if (
        dispatchedAction.type === Sessions.DELETE_SESSION &&
        calibrationSession?.id === dispatchedAction.payload.sessionId
      ) {
        deleteRequestId.current = dispatchedAction.meta.requestId
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

  const useTrashSurfaceForTipCalSetting = useSelector(
    getUseTrashSurfaceForTipCal
  )
  const useTrashSurface = React.useRef<boolean | null>(
    useTrashSurfaceForTipCalSetting
  )

  const calibrationSession = useSelector((state: State) => {
    const tipLengthSession: Sessions.Session | null = Sessions.getRobotSessionOfType(
      state,
      robotName,
      Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION
    )
    const extendedPipOffsetSession: Sessions.Session | null = Sessions.getRobotSessionOfType(
      state,
      robotName,
      Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION
    )
    if (
      tipLengthSession &&
      tipLengthSession.sessionType ===
        Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION
    ) {
      return tipLengthSession
    } else if (
      extendedPipOffsetSession &&
      extendedPipOffsetSession.sessionType ===
        Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION
    ) {
      return extendedPipOffsetSession
    }
    return null
  })

  const handleStart = () => {
    if (isExtendedPipOffset && useTrashSurface.current !== null) {
      dispatchRequests(
        Sessions.ensureSession(
          robotName,
          Sessions.SESSION_TYPE_PIPETTE_OFFSET_CALIBRATION,
          {
            mount,
            hasCalibrationBlock: !useTrashSurface.current,
            shouldCalibrateTipLength: true,
            tipRackDefinition,
          }
        )
      )
    } else if (useTrashSurface.current !== null) {
      dispatchRequests(
        Sessions.ensureSession(
          robotName,
          Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION,
          {
            mount,
            hasCalibrationBlock: !useTrashSurface.current,
            tipRackDefinition,
          }
        )
      )
    } else {
      setShowCalBlockPrompt(true)
    }
  }

  const showSpinner =
    useSelector<State, RequestState | null>(state =>
      trackedRequestId.current
        ? RobotApi.getRequestById(state, trackedRequestId.current)
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

  const setHasBlock = (hasBlock: boolean, rememberPreference: boolean) => {
    useTrashSurface.current = !hasBlock
    if (rememberPreference) {
      dispatch(setUseTrashSurfaceForTipCal(!hasBlock))
    }
    handleStart()
    setShowCalBlockPrompt(false)
  }

  const handleCloseWizard = () => {
    setShowWizard(false)
    useTrashSurface.current = useTrashSurfaceForTipCalSetting
  }

  const { confirm, showConfirmation, cancel } = useConditionalConfirm(
    handleStart,
    hasCalibrated
  )

  return (
    <>
      <CalibrationInfoBox
        confirmed={hasCalibrated}
        title={`${mount} pipette tip length calibration`}
      >
        <UncalibratedInfo
          showSpinner={showSpinner}
          hasCalibrated={hasCalibrated}
          handleStart={confirm}
        />
      </CalibrationInfoBox>
      {showConfirmation && (
        <Portal>
          <ConfirmRecalibrationModal
            confirm={confirm}
            cancel={cancel}
            tiprackDisplayName={tipRackDefinition.metadata.displayName}
          />
        </Portal>
      )}
      {showCalBlockPrompt && (
        <Portal>
          <AskForCalibrationBlockModal setHasBlock={setHasBlock} />
        </Portal>
      )}
      {showWizard && useTrashSurface.current !== null && (
        <Portal>
          {isExtendedPipOffset ? (
            <CalibratePipetteOffset
              session={calibrationSession}
              robotName={robotName}
              closeWizard={() => setShowWizard(false)}
              showSpinner={showSpinner}
              dispatchRequests={dispatchRequests}
            />
          ) : (
            <CalibrateTipLength
              robotName={robotName}
              session={calibrationSession}
              closeWizard={handleCloseWizard}
              hasBlock={!useTrashSurface.current}
              showSpinner={showSpinner}
              dispatchRequests={dispatchRequests}
            />
          )}
        </Portal>
      )}
    </>
  )
}

type UncalibratedInfoProps = {|
  hasCalibrated: boolean,
  handleStart: () => mixed,
  showSpinner: boolean,
|}
function UncalibratedInfo(props: UncalibratedInfoProps): React.Node {
  const { hasCalibrated, handleStart, showSpinner } = props

  const buttonText = !hasCalibrated
    ? CALIBRATE_TIP_LENGTH
    : RECALIBRATE_TIP_LENGTH
  const leftChildren = (
    <div>
      <p>{!hasCalibrated ? IS_NOT_CALIBRATED : IS_CALIBRATED}</p>
      <PrimaryButton onClick={handleStart}>
        {showSpinner ? (
          <Icon name="ot-spinner" height="1em" spin />
        ) : (
          buttonText
        )}
      </PrimaryButton>
    </div>
  )

  return <CalibrationInfoContent leftChildren={leftChildren} />
}
