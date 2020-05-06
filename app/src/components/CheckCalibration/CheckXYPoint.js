// @flow
import * as React from 'react'
import { PrimaryButton, type Mount } from '@opentrons/components'
import { useDispatch } from 'react-redux'

import type { Dispatch } from '../../types'
import {
  jogRobotCalibrationCheck,
  confirmStepRobotCalibrationCheck,
} from '../../calibration'
import { JogControls } from '../JogControls'
import type { JogAxis, JogDirection, JogStep } from '../../http-api-client'
import styles from './styles.css'
import { formatJogVector } from './utils'

import slot1LeftMultiDemoAsset from './videos/SLOT_1_LEFT_MULTI_X-Y_(640X480)_REV1.webm'
import slot1LeftSingleDemoAsset from './videos/SLOT_1_LEFT_SINGLE_X-Y_(640X480)_REV1.webm'
import slot1RightMultiDemoAsset from './videos/SLOT_1_RIGHT_MULTI_X-Y_(640X480)_REV1.webm'
import slot1RightSingleDemoAsset from './videos/SLOT_1_RIGHT_SINGLE_X-Y_(640X480)_REV1.webm'
import slot3LeftMultiDemoAsset from './videos/SLOT_3_LEFT_MULTI_X-Y_(640X480)_REV1.webm'
import slot3LeftSingleDemoAsset from './videos/SLOT_3_LEFT_SINGLE_X-Y_(640X480)_REV1.webm'
import slot3RightMultiDemoAsset from './videos/SLOT_3_RIGHT_MULTI_X-Y_(640X480)_REV1.webm'
import slot3RightSingleDemoAsset from './videos/SLOT_3_RIGHT_SINGLE_X-Y_(640X480)_REV1.webm'
import slot7LeftMultiDemoAsset from './videos/SLOT_7_LEFT_MULTI_X-Y_(640X480)_REV1.webm'
import slot7LeftSingleDemoAsset from './videos/SLOT_7_LEFT_SINGLE_X-Y_(640X480)_REV1.webm'
import slot7RightMultiDemoAsset from './videos/SLOT_7_RIGHT_MULTI_X-Y_(640X480)_REV1.webm'
import slot7RightSingleDemoAsset from './videos/SLOT_7_RIGHT_SINGLE_X-Y_(640X480)_REV1.webm'

const assetMap = [
  {
    left: {
      multi: slot1LeftMultiDemoAsset,
      single: slot1LeftSingleDemoAsset,
    },
    right: {
      multi: slot1RightMultiDemoAsset,
      single: slot1RightSingleDemoAsset,
    },
  },
  {
    left: {
      multi: slot3LeftMultiDemoAsset,
      single: slot3LeftSingleDemoAsset,
    },
    right: {
      multi: slot3RightMultiDemoAsset,
      single: slot3RightSingleDemoAsset,
    },
  },
  {
    left: {
      multi: slot7LeftMultiDemoAsset,
      single: slot7LeftSingleDemoAsset,
    },
    right: {
      multi: slot7RightMultiDemoAsset,
      single: slot7RightSingleDemoAsset,
    },
  },
]

const CHECK_POINT_XY_HEADER = 'Check the X and Y-axis in'
const CHECK_XY_BUTTON_TEXT = 'check x and y-axis'
const CHECK_XY_SLOT_NAMES: Array<string> = ['slot 1', 'slot 3', 'slot 7']
const JOG_UNTIL = 'Jog pipette until tip is'
const JUST_BARELY = 'just barely'
const TOUCHING_THE_CROSS = 'touching the cross in'
const THEN = 'Then'
const CHECK_AXES = 'check x and y-axis'
const TO_DETERMINE_MATCH =
  'to see if the position matches the calibration co-ordinate.'

type CheckXYPointProps = {|
  pipetteId: string,
  robotName: string,
  xyStepIndex: number,
  isMulti: boolean,
  mount: Mount,
|}
export function CheckXYPoint(props: CheckXYPointProps) {
  const { pipetteId, robotName, xyStepIndex, isMulti, mount } = props

  const dispatch = useDispatch<Dispatch>()
  const demoAsset = React.useMemo(
    () => assetMap[xyStepIndex][mount][isMulti ? 'multi' : 'single'],
    [xyStepIndex, mount, isMulti]
  )
  function jog(axis: JogAxis, direction: JogDirection, step: JogStep) {
    dispatch(
      jogRobotCalibrationCheck(
        robotName,
        pipetteId,
        formatJogVector(axis, direction, step)
      )
    )
  }

  function confirmStep() {
    dispatch(confirmStepRobotCalibrationCheck(robotName, pipetteId))
  }

  return (
    <>
      <div className={styles.modal_header}>
        <h3>
          {CHECK_POINT_XY_HEADER}
          &nbsp;
          {CHECK_XY_SLOT_NAMES[xyStepIndex]}
        </h3>
      </div>
      <div className={styles.tip_pick_up_demo_wrapper}>
        <p className={styles.tip_pick_up_demo_body}>
          {JOG_UNTIL}
          <b>&nbsp;{JUST_BARELY}&nbsp;</b>
          {TOUCHING_THE_CROSS}
          <b>&nbsp;{CHECK_XY_SLOT_NAMES[xyStepIndex]}.&nbsp;</b>
          {THEN}
          <b>&nbsp;{CHECK_AXES}&nbsp;</b>
          {TO_DETERMINE_MATCH}
        </p>
        <div className={styles.step_check_video_wrapper}>
          <video
            key={String(demoAsset)}
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
        <JogControls jog={jog} stepSizes={[0.1, 1]} axes={['x', 'y']} />
      </div>
      <div className={styles.button_row}>
        <PrimaryButton
          onClick={confirmStep}
          className={styles.pick_up_tip_button}
        >
          {CHECK_XY_BUTTON_TEXT}
        </PrimaryButton>
      </div>
    </>
  )
}
