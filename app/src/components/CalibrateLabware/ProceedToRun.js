// @flow
// info panel for labware calibration page
import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { push } from 'connected-react-router'
import { PrimaryButton, AlertModal } from '@opentrons/components'
import some from 'lodash/some'

import { selectors as robotSelectors } from '../../robot'
import type { Dispatch } from '../../types'
import pcrSealSrc from '../../img/place_pcr_seal.png'
import { Portal } from '../portal'
import styles from './styles.css'

type Props = {|
  returnTip: () => mixed,
|}

function InfoBoxButton(props: Props) {
  const { returnTip } = props
  const dispatch = useDispatch<Dispatch>()
  const sessionModules = useSelector(robotSelectors.getModules)
  const [mustPrepForRun, setMustPrepForRun] = useState(false)

  useEffect(() => {
    if (some(sessionModules, mod => mod.name === 'thermocycler')) {
      setMustPrepForRun(true)
    }
  }, [sessionModules])

  const handleClick = () => {
    // $FlowFixMe: robotActions.returnTip is not typed
    returnTip()
    dispatch(push(`/run`))
  }

  return (
    <>
      <PrimaryButton className={styles.info_box_button} onClick={handleClick}>
        return tip and proceed to run
      </PrimaryButton>
      {mustPrepForRun && (
        <Portal>
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
                setMustPrepForRun(false)
              }}
            >
              Confirm PCR Seal is in place
            </PrimaryButton>
          </AlertModal>
        </Portal>
      )}
    </>
  )
}

export default InfoBoxButton
