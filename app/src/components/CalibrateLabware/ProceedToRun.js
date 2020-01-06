// @flow
// info panel for labware calibration page
import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { push } from 'connected-react-router'
import cx from 'classnames'
import { PrimaryButton, AlertModal, ModalPage } from '@opentrons/components'
import some from 'lodash/some'

import { selectors as robotSelectors } from '../../robot'
import type { Dispatch } from '../../types'
import pcrSealSrc from '../../img/place_pcr_seal.png'
import { Portal } from '../portal'
import InProgressContents from './InProgressContents'
import styles from './styles.css'
import { THERMOCYCLER } from '../../modules'

type Props = {|
  returnTip: () => mixed,
|}

function ProceedToRun(props: Props) {
  const { returnTip } = props
  const dispatch = useDispatch<Dispatch>()
  const sessionModules = useSelector(robotSelectors.getModules)
  const inProgress = useSelector(robotSelectors.getReturnTipInProgress)
  const [mustPrepForRun, setMustPrepForRun] = useState(false)
  const [runPrepModalOpen, setRunPrepModalOpen] = useState(false)

  useEffect(() => {
    if (some(sessionModules, mod => mod.name === THERMOCYCLER)) {
      setMustPrepForRun(true)
    }
  }, [sessionModules])

  const handleClick = () => {
    // $FlowFixMe: robotActions.returnTip is not typed
    returnTip()
    if (mustPrepForRun) {
      setRunPrepModalOpen(true)
    } else {
      dispatch(push(`/run`))
    }
  }

  return (
    <>
      <PrimaryButton className={styles.info_box_button} onClick={handleClick}>
        return tip and proceed to run
      </PrimaryButton>
      {runPrepModalOpen && (
        <Portal>
          {inProgress && (
            <ModalPage
              contentsClassName={cx({
                [styles.modal_contents]: inProgress,
                [styles.in_progress_contents]: inProgress,
              })}
            >
              <InProgressContents />
            </ModalPage>
          )}
          {!inProgress && (
            <AlertModal
              alertOverlay
              iconName={null}
              heading="Place PCR seal on Thermocycler"
            >
              <span className={styles.place_seal_instructions}>
                Place rubber PCR seal on lid of Thermocycler Module
              </span>
              <p className={styles.secure_latch_explanation}>
                Doing this prior to the run enables a tight seal to reduce
                evaporation.
              </p>
              <div className={styles.modal_image_wrapper}>
                <img
                  src={pcrSealSrc}
                  className={styles.place_seal_image}
                  alt="place rubber PCR seal on lid of Thermocycler Module"
                />
              </div>
              <PrimaryButton
                className={styles.open_lid_button}
                onClick={() => {
                  dispatch(push(`/run`))
                }}
              >
                Confirm PCR Seal is in place
              </PrimaryButton>
            </AlertModal>
          )}
        </Portal>
      )}
    </>
  )
}

export default ProceedToRun
