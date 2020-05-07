// @flow
import * as React from 'react'
import { PrimaryButton } from '@opentrons/components'
import { getLabwareDisplayName } from '@opentrons/shared-data'
import { useDispatch } from 'react-redux'

import type { Dispatch } from '../../types'
import type { RobotCalibrationCheckLabware } from '../../calibration/api-types'
import {
  pickUpTipRobotCalibrationCheck,
  jogRobotCalibrationCheck,
  confirmTipRobotCalibrationCheck,
  invalidateTipRobotCalibrationCheck,
} from '../../calibration'
import { getLatestLabwareDef } from '../../getLabware'
import { JogControls } from '../JogControls'
import type { JogAxis, JogDirection, JogStep } from '../../http-api-client'
import styles from './styles.css'
import multiA1DemoAsset from './videos/A1-Multi-Channel-SEQ.webm'
import singleA1DemoAsset from './videos/A1-Single-Channel-SEQ.webm'
import multiB1DemoAsset from './videos/B1-Multi-Channel-SEQ.webm'
import singleB1DemoAsset from './videos/B1-Single-Channel-SEQ.webm'
import { formatJogVector } from './utils'

const TIP_PICK_UP_HEADER = 'Position pipette over '
const TIP_PICK_UP_BUTTON_TEXT = 'Pick up tip'

const CONFIRM_TIP_BODY = 'Did pipette pick up tips successfully?'
const CONFIRM_TIP_YES_BUTTON_TEXT = 'Yes, move to first check'
const CONFIRM_TIP_NO_BUTTON_TEXT = 'No, try again'
const JOG_UNTIL_AT = 'Jog pipette until nozzle is centered above'
const WELL_NAME = 'A1'
const POSITION_AND = 'position and'
const FLUSH = 'flush'
const WITH_TOP_OF_TIP = 'with the top of the tip.'

const ASSET_MAP = {
  A1: {
    multi: multiA1DemoAsset,
    single: singleA1DemoAsset,
  },
  B1: {
    multi: multiB1DemoAsset,
    single: singleB1DemoAsset,
  },
}
type TipPickUpProps = {|
  pipetteId: string,
  isMulti: boolean,
  tiprack: RobotCalibrationCheckLabware,
  robotName: string,
  isInspecting: boolean,
|}
export function TipPickUp(props: TipPickUpProps) {
  const { pipetteId, tiprack, robotName, isMulti, isInspecting } = props
  const tiprackDef = React.useMemo(
    () => getLatestLabwareDef(tiprack?.loadName),
    [tiprack]
  )
  const dispatch = useDispatch<Dispatch>()

  function jog(axis: JogAxis, direction: JogDirection, step: JogStep) {
    dispatch(
      jogRobotCalibrationCheck(
        robotName,
        pipetteId,
        formatJogVector(axis, direction, step)
      )
    )
  }

  function pickUpTip() {
    dispatch(pickUpTipRobotCalibrationCheck(robotName, pipetteId))
  }

  function confirmTipPickedUp() {
    dispatch(confirmTipRobotCalibrationCheck(robotName, pipetteId))
  }

  function rejectPickUpAttempt() {
    dispatch(invalidateTipRobotCalibrationCheck(robotName, pipetteId))
  }

  // TODO: BC: once both pipettes are usable in flow,
  // pull this well name from session data and receive as prop
  const tiprackWellName = 'A1'
  const demoAsset = ASSET_MAP[tiprackWellName][isMulti ? 'multi' : 'single']

  return (
    <>
      <div className={styles.modal_header}>
        <h3>
          {TIP_PICK_UP_HEADER}
          {tiprackDef
            ? getLabwareDisplayName(tiprackDef).replace('µL', 'uL')
            : null}
        </h3>
      </div>

      {isInspecting ? (
        <div className={styles.tip_pick_up_confirmation_wrapper}>
          <p className={styles.pick_up_tip_confirmation_body}>
            {CONFIRM_TIP_BODY}
          </p>
          <PrimaryButton
            className={styles.pick_up_tip_confirmation_button}
            onClick={rejectPickUpAttempt}
          >
            {CONFIRM_TIP_NO_BUTTON_TEXT}
          </PrimaryButton>
          <PrimaryButton
            className={styles.pick_up_tip_confirmation_button}
            onClick={confirmTipPickedUp}
          >
            {CONFIRM_TIP_YES_BUTTON_TEXT}
          </PrimaryButton>
        </div>
      ) : (
        <>
          <div className={styles.tip_pick_up_demo_wrapper}>
            <p className={styles.tip_pick_up_demo_body}>
              {JOG_UNTIL_AT}
              <b>&nbsp;{WELL_NAME}&nbsp;</b>
              {POSITION_AND}
              <b>&nbsp;{FLUSH}&nbsp;</b>
              {WITH_TOP_OF_TIP}
            </p>
            <div className={styles.step_check_video_wrapper}>
              <video
                key={demoAsset}
                className={styles.step_check_video}
                autoPlay={true}
                loop={true}
                controls={false}
              >
                <source src={demoAsset} />
              </video>
            </div>
          </div>
          <div className={styles.tip_pick_up_controls_wrapper}>
            <JogControls jog={jog} />
          </div>
          <div className={styles.button_row}>
            <PrimaryButton
              onClick={pickUpTip}
              className={styles.pick_up_tip_button}
            >
              {TIP_PICK_UP_BUTTON_TEXT}
            </PrimaryButton>
          </div>
        </>
      )}
    </>
  )
}
