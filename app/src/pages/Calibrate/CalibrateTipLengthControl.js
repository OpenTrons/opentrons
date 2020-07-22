// @flow
import * as React from 'react'
import { useSelector } from 'react-redux'
import last from 'lodash/last'
import { Icon, PrimaryButton, type Mount } from '@opentrons/components'
import * as RobotApi from '../../robot-api'
import * as Sessions from '../../sessions'

import { CalibrateTipLength } from '../../components/CalibrateTipLength'
import { ToolSettingAlertModal } from '../../components/CalibrateTipLength/ToolSettingAlertModal'
import { CalibrationInfoBox } from '../../components/CalibrationInfoBox'
import { CalibrationInfoContent } from '../../components/CalibrationInfoContent'
import { Portal } from '../../components/portal'

import type { State } from '../../types'

export type TipLengthCalibrationControlProps = {|
  robotName: string,
  hasCalibrated: boolean,
  mount: Mount,
|}

const IS_CALIBRATED = 'Pipette tip height is calibrated'
const IS_NOT_CALIBRATED = 'Pipette tip height is not calibrated'
const CALIBRATE_TIP_LENGTH = 'Calibrate tip length'
const RECALIBRATE_TIP_LENGTH = 'Re-Calibrate tip length'

export function CalibrateTipLengthControl({
  robotName,
  hasCalibrated,
  mount,
}: TipLengthCalibrationControlProps): React.Node {
  const [showWizard, setShowWizard] = React.useState(false)
  const [showCalBlockPrompt, setShowCalBlockPrompt] = React.useState(false)
  const [dispatch, requestIds] = RobotApi.useDispatchApiRequest()

  //  TODO: store saved cal block preference in app config and grab value
  const hasCalBlock = React.useRef<boolean | null>(null)

  const requestState = useSelector((state: State) => {
    const reqId = last(requestIds) ?? null
    return RobotApi.getRequestById(state, reqId)
  })
  const requestStatus = requestState?.status ?? null

  React.useEffect(() => {
    if (requestStatus === RobotApi.SUCCESS) setShowWizard(true)
  }, [requestStatus])

  const tipLengthCalibrationSession = useSelector((state: State) => {
    const session: Sessions.Session | null = Sessions.getRobotSessionOfType(
      state,
      robotName,
      Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION
    )
    if (
      session &&
      session.sessionType === Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION
    ) {
      return session
    }
    return null
  })

  const ensureSession = React.useCallback(() => {
    if (hasCalBlock.current === null) return
    dispatch(
      Sessions.ensureSession(
        robotName,
        Sessions.SESSION_TYPE_TIP_LENGTH_CALIBRATION,
        { mount, hasCalibrationBlock: hasCalBlock.current }
      )
    )
  }, [dispatch, robotName, hasCalBlock, mount])

  const handleStart = React.useCallback(() => {
    if (hasCalBlock.current !== null) {
      ensureSession()
    } else {
      setShowCalBlockPrompt(true)
    }
  }, [hasCalBlock, ensureSession])

  const setHasBlock = React.useCallback(
    (hasCalibrationBlock: boolean) => {
      hasCalBlock.current = hasCalibrationBlock
      handleStart()
      setShowCalBlockPrompt(false)
    },
    [hasCalBlock, handleStart]
  )

  return (
    <>
      <CalibrationInfoBox
        confirmed={hasCalibrated}
        title={`${mount} pipette tip length calibration`}
      >
        <UncalibratedInfo
          requestStatus={requestStatus}
          hasCalibrated={hasCalibrated}
          handleStart={handleStart}
        />
      </CalibrationInfoBox>
      {showCalBlockPrompt && (
        <Portal>
          <ToolSettingAlertModal setHasBlock={setHasBlock} />
        </Portal>
      )}
      {showWizard && hasCalBlock.current !== null && (
        <Portal>
          <CalibrateTipLength
            robotName={robotName}
            session={tipLengthCalibrationSession}
            closeWizard={() => setShowWizard(false)}
            hasBlock={hasCalBlock.current}
          />
        </Portal>
      )}
    </>
  )
}

type UncalibratedInfoProps = {|
  hasCalibrated: boolean,
  handleStart: () => void,
  requestStatus: ?string,
|}
function UncalibratedInfo(props: UncalibratedInfoProps): React.Node {
  const { hasCalibrated, handleStart, requestStatus } = props

  const leftChildren = (
    <div>
      <p>{!hasCalibrated ? IS_NOT_CALIBRATED : IS_CALIBRATED}</p>
      <PrimaryButton onClick={handleStart}>
        {requestStatus === RobotApi.PENDING && (
          <Icon name="ot-spinner" height="1em" spin />
        )}
        {requestStatus !== RobotApi.PENDING &&
          (!hasCalibrated ? CALIBRATE_TIP_LENGTH : RECALIBRATE_TIP_LENGTH)}
      </PrimaryButton>
    </div>
  )

  return <CalibrationInfoContent leftChildren={leftChildren} />
}
