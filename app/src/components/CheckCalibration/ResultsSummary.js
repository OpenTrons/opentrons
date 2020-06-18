// @flow
import * as React from 'react'
import { useSelector } from 'react-redux'
import { PrimaryButton, OutlineButton } from '@opentrons/components'
import find from 'lodash/find'
import pick from 'lodash/pick'
import partition from 'lodash/partition'
import type { State } from '../../types'
import * as Sessions from '../../sessions'
import * as Calibration from '../../calibration'
import styles from './styles.css'
import { PipetteComparisons } from './PipetteComparisons'
import { saveAs } from 'file-saver'

import type { CalibrationStatus } from '../../calibration/types'
import type {
  RobotCalibrationCheckComparisonsByStep,
  RobotCalibrationCheckInstrument,
} from '../../sessions/types'

const ROBOT_CALIBRATION_CHECK_SUMMARY_HEADER = 'Calibration check summary:'
const DROP_TIP_AND_EXIT = 'Drop tip in trash and exit'
const DOWNLOAD_SUMMARY = 'Download JSON summary'

type ResultsSummaryProps = {|
  robotName: string,
  deleteSession: () => mixed,
  comparisonsByStep: RobotCalibrationCheckComparisonsByStep,
  instrumentsByMount: { [mount: string]: RobotCalibrationCheckInstrument, ... },
|}
export function ResultsSummary(props: ResultsSummaryProps): React.Node {
  const {
    robotName,
    deleteSession,
    comparisonsByStep,
    instrumentsByMount,
  } = props

  const calibrationStatus = useSelector<State, CalibrationStatus | null>(
    state => Calibration.getCalibrationStatus(state, robotName)
  )

  const handleDownloadButtonClick = () => {
    const now = new Date()
    const report = {
      comparisonsByStep,
      instrumentsByMount,
      calibrationStatus,
      savedAt: now.toISOString(),
    }
    const data = new Blob([JSON.stringify(report)], {
      type: 'application/json',
    })
    saveAs(data, 'OT-2 Robot Calibration Check Report.json')
  }

  const firstPipette = find(
    instrumentsByMount,
    (p: RobotCalibrationCheckInstrument) =>
      p.rank === Sessions.CHECK_PIPETTE_RANK_FIRST
  )
  const secondPipette = find(
    instrumentsByMount,
    (p: RobotCalibrationCheckInstrument) =>
      p.rank === Sessions.CHECK_PIPETTE_RANK_SECOND
  )
  const [firstComparisonsByStep, secondComparisonsByStep] = partition(
    Object.keys(comparisonsByStep),
    compStep => Sessions.FIRST_PIPETTE_COMPARISON_STEPS.includes(compStep)
  ).map(stepNames => pick(comparisonsByStep, stepNames))

  return (
    <>
      <h3 className={styles.summary_page_header}>
        {ROBOT_CALIBRATION_CHECK_SUMMARY_HEADER}
      </h3>

      <div className={styles.summary_page_contents}>
        <div className={styles.summary_section}>
          <PipetteComparisons
            pipette={firstPipette}
            comparisonsByStep={firstComparisonsByStep}
            allSteps={Sessions.FIRST_PIPETTE_COMPARISON_STEPS}
          />
        </div>
        {secondPipette && (
          <div className={styles.summary_section}>
            <PipetteComparisons
              pipette={secondPipette}
              comparisonsByStep={secondComparisonsByStep}
              allSteps={Sessions.SECOND_PIPETTE_COMPARISON_STEPS}
            />
          </div>
        )}
      </div>
      <OutlineButton
        className={styles.download_summary_button}
        onClick={handleDownloadButtonClick}
      >
        {DOWNLOAD_SUMMARY}
      </OutlineButton>
      <PrimaryButton onClick={deleteSession}>{DROP_TIP_AND_EXIT}</PrimaryButton>
    </>
  )
}
