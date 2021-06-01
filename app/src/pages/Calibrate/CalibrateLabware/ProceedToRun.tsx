// info panel for labware calibration page
import * as React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { push } from 'connected-react-router'
import { PrimaryButton, AlertModal, SpinnerModal } from '@opentrons/components'
import some from 'lodash/some'

import { selectors as robotSelectors } from '../../../redux/robot'
import type { Dispatch } from '../../../redux/types'
import pcrSealSrc from '../../../assets/images/place_pcr_seal.png'
import { Portal } from '../../../App/portal'
import styles from './styles.css'
import { THERMOCYCLER_MODULE_TYPE, getModuleType } from '../../../redux/modules'

const IS_HOMING_MESSAGE = 'Returning tip and homing robot'

export interface ProceedToRunProps {
  returnTip: () => unknown
}

export function ProceedToRun(props: ProceedToRunProps): JSX.Element {
  const { returnTip } = props
  const dispatch = useDispatch<Dispatch>()
  const sessionModules = useSelector(robotSelectors.getModules)
  const inProgress = useSelector(robotSelectors.getReturnTipInProgress)
  const [mustPrepForRun, setMustPrepForRun] = React.useState(false)
  const [runPrepModalOpen, setRunPrepModalOpen] = React.useState(false)

  React.useEffect(() => {
    if (
      some(
        sessionModules,
        mod => getModuleType(mod.model) === THERMOCYCLER_MODULE_TYPE
      )
    ) {
      setMustPrepForRun(true)
    }
  }, [sessionModules])

  const handleClick = (): void => {
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
          {inProgress ? (
            <SpinnerModal message={IS_HOMING_MESSAGE} />
          ) : (
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
