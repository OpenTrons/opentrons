// deck review modal for labware calibration page
import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import some from 'lodash/some'
import { PrimaryButton, AlertModal } from '@opentrons/components'

import {
  actions as robotActions,
  selectors as robotSelectors,
} from '../../../redux/robot'
import { THERMOCYCLER_MODULE_TYPE, getModuleType } from '../../../redux/modules'
import secureTCLatchSrc from '../../../assets/images/secure_tc_latch.png'

import { Portal } from '../../../App/portal'
import { DeckMap } from '../../../molecules/DeckMap'
import { Prompt } from './Prompt'
import styles from './styles.css'

import type { Dispatch } from '../../../redux/types'

export interface ReviewDeckProps {
  slot: string | null | undefined
}

export function ReviewDeck(props: ReviewDeckProps): JSX.Element {
  const { slot } = props

  const dispatch = useDispatch<Dispatch>()
  const allLabware = useSelector(robotSelectors.getLabware)
  const calibratorMount = useSelector(robotSelectors.getCalibratorMount)
  const sessionModules = useSelector(robotSelectors.getModules)

  const [isPrepNestedLabwareOpen, setIsPrepNestedLabwareOpen] = React.useState(
    false
  )

  const mustPrepNestedLabware = some(
    sessionModules,
    mod => getModuleType(mod.model) === THERMOCYCLER_MODULE_TYPE
  )

  const currentLabware = allLabware.find(lw => lw.slot === slot)

  const continueToCalibrate = (): void => {
    if (currentLabware && calibratorMount) {
      const mountToUse = currentLabware.calibratorMount || calibratorMount
      dispatch(robotActions.moveTo(mountToUse, currentLabware.slot))
    }
  }
  const handleClick = (): void => {
    if (mustPrepNestedLabware) {
      setIsPrepNestedLabwareOpen(true)
    } else {
      continueToCalibrate()
    }
  }

  return (
    <div className={styles.page_content_dark}>
      {currentLabware && <Prompt {...currentLabware} onClick={handleClick} />}
      <div className={styles.deck_map_wrapper}>
        <DeckMap className={styles.deck_map} />
      </div>
      {isPrepNestedLabwareOpen && (
        <Portal>
          <AlertModal
            iconName={null}
            heading="Position latch to hold down plate"
          >
            <span className={styles.secure_latch_instructions}>
              Push down the latch and lock in place to hold the PCR plate.
            </span>
            <p className={styles.secure_latch_explanation}>
              This helps to ensure your PCR plate stays secure in place when the
              Thermocycler Module lid opens during a run.
            </p>
            <div className={styles.modal_image_wrapper}>
              <img
                src={secureTCLatchSrc}
                className={styles.secure_latch_image}
                alt="secure Thermocycler Module plate latch"
              />
            </div>
            <PrimaryButton
              className={styles.open_lid_button}
              onClick={() => {
                continueToCalibrate()
              }}
            >
              Confirm PCR Plate Is Latched Down
            </PrimaryButton>
          </AlertModal>
        </Portal>
      )}
    </div>
  )
}
