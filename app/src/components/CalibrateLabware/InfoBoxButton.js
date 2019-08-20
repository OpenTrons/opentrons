// @flow
// info panel for labware calibration page
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { push } from 'connected-react-router'

import {
  selectors as robotSelectors,
  actions as robotActions,
} from '../../robot'

import { PrimaryButton } from '@opentrons/components'
import styles from './styles.css'

import type { Mount, Labware } from '../../robot'
import type { State, Dispatch } from '../../types'

import ProceedToRun from './ProceedToRun'

type Props = {| labware: ?Labware |}

function InfoBoxButton(props: Props) {
  const { labware } = props
  const dispatch = useDispatch<Dispatch>()

  const nextLabware =
    !labware || labware.calibration === 'confirmed'
      ? useSelector(robotSelectors.getNextLabware)
      : null
  const buttonTarget = nextLabware || labware
  if (!buttonTarget || labware.isMoving) return null

  const buttonTargetIsNext =
    buttonTarget != null && buttonTarget === nextLabware
  const targetConfirmed = buttonTarget && buttonTarget.confirmed
  const mountToUse: Mount =
    buttonTarget.calibratorMount ||
    useSelector(robotSelectors.getCalibratorMount)

  if (buttonTargetIsNext || !targetConfirmed) {
    const type = robotSelectors.labwareType(buttonTarget)
    return (
      <PrimaryButton
        className={styles.info_box_button}
        onClick={() => {
          dispatch(robotActions.moveTo(mountToUse, buttonTarget.slot))
          dispatch(push(`/calibrate/labware/${buttonTarget.slot}`))
        }}
      >
        {buttonTargetIsNext ? `Move to next ${type}` : `Move to ${type}`}
      </PrimaryButton>
    )
  } else {
    return (
      <ProceedToRun
        returnTip={() => {
          dispatch(robotActions.returnTip(mountToUse))
        }}
      />
    )
  }
}

export default InfoBoxButton
