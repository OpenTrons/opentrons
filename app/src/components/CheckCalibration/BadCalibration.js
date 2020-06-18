// @flow
import * as React from 'react'
import { Icon, PrimaryButton, Link } from '@opentrons/components'
import styles from './styles.css'

const BAD_ROBOT_CALIBRATION_CHECK_HEADER = 'Unable to check robot calibration'
const SUMMARY =
  "Your pipette tip pick-up location does not match its calibrated location. This may occur if the tip rack is out of place, or if your robot's deck is out of calibration"
const TO_TROUBLESHOOT = 'To troubleshoot this issue:'
const TIP_RACK_CENTERED = 'Confirm your tip rack is centered in its slot'
const USE_OPENTRONS_TIPS = 'Confirm you are using Opentrons brand tips'
const PERFORM_CALIBRATION = 'If you continue to see this error, view'
const THIS_ARTICLE = 'this article'
const LEARN_MORE = 'to troubleshoot'
const BAD_ROBOT_CALIBRATION_CHECK_BUTTON_TEXT = 'Drop tip in trash and exit'

const DECK_CAL_ARTICLE_URL =
  'https://support.opentrons.com/en/articles/4028788-checking-your-ot-2-s-calibration'
type BadCalibrationProps = {|
  deleteSession: () => mixed,
|}
export function BadCalibration(props: BadCalibrationProps): React.Node {
  const { deleteSession } = props

  return (
    <div className={styles.padded_contents_wrapper}>
      <div className={styles.modal_icon_wrapper}>
        <Icon name="close-circle" className={styles.error_status_icon} />
        <h3>{BAD_ROBOT_CALIBRATION_CHECK_HEADER}</h3>
      </div>
      <div className={styles.bad_cal_body}>
        <p className={styles.error_explanation}>{SUMMARY}</p>
        <p className={styles.error_explanation}>{TO_TROUBLESHOOT}</p>
        <ul className={styles.error_explanation_list}>
          <li className={styles.error_explanation}>{TIP_RACK_CENTERED}</li>
          <li className={styles.error_explanation}>{USE_OPENTRONS_TIPS}</li>
        </ul>
        <p className={styles.error_explanation}>
          {PERFORM_CALIBRATION}
          &nbsp;
          <Link href={DECK_CAL_ARTICLE_URL} external>
            {THIS_ARTICLE}
          </Link>
          &nbsp;
          {LEARN_MORE}
        </p>
      </div>
      <PrimaryButton onClick={deleteSession}>
        {BAD_ROBOT_CALIBRATION_CHECK_BUTTON_TEXT}
      </PrimaryButton>
    </div>
  )
}
