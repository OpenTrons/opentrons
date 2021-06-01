// play pause run buttons for sidepanel
import * as React from 'react'
import { OutlineButton, HoverTooltip } from '@opentrons/components'

import { ConfirmCancelModal } from '../RunLog'
import styles from './styles.css'

const MISSING_MODULES =
  'Please attach all required modules before running this protocol'

const DOOR_OPEN_RUN = 'Please close the robot door before running this protocol'

const DOOR_OPEN_RESUME = 'Please close the robot door before resuming'

export interface RunControlsProps {
  disabled: boolean
  modulesReady: boolean
  isReadyToRun: boolean
  isPaused: boolean
  isRunning: boolean
  isBlocked: boolean
  onRunClick: () => unknown
  onPauseClick: () => unknown
  onResumeClick: () => unknown
  onResetClick: () => unknown
}

export function RunControls(props: RunControlsProps): JSX.Element {
  const {
    disabled,
    modulesReady,
    isReadyToRun,
    isPaused,
    isRunning,
    isBlocked,
    onRunClick,
    onPauseClick,
    onResumeClick,
    onResetClick,
  } = props

  const [isConfirmCancelOpen, setConfirmCancelOpen] = React.useState(false)
  const onPauseResumeClick = isPaused ? onResumeClick : onPauseClick
  const pauseResumeText = isPaused ? 'Resume' : 'Pause'
  const controlsDisabled = isConfirmCancelOpen || disabled

  const handleCancelClick: React.MouseEventHandler = () => {
    onPauseClick()
    setConfirmCancelOpen(true)
  }

  let runButton
  let pauseResumeButton
  let cancelButton
  let resetButton

  if (isReadyToRun && !isRunning) {
    // TODO(mc, 2019-09-03): add same check for pipettes
    const runDisabled = disabled || !modulesReady || isBlocked
    let runTooltip = null
    if (!modulesReady) {
      runTooltip = MISSING_MODULES
    } else if (isBlocked) {
      runTooltip = DOOR_OPEN_RUN
    }

    runButton = (
      <HoverTooltip tooltipComponent={runTooltip}>
        {hoverTooltipHandlers => (
          <div {...hoverTooltipHandlers}>
            <OutlineButton
              onClick={onRunClick}
              className={styles.run_button}
              disabled={runDisabled}
            >
              Start Run
            </OutlineButton>
          </div>
        )}
      </HoverTooltip>
    )
  } else if (isRunning) {
    const pauseDisabled = disabled || isBlocked || controlsDisabled
    const pauseTooltip = isBlocked ? DOOR_OPEN_RESUME : null

    pauseResumeButton = (
      <HoverTooltip tooltipComponent={pauseTooltip}>
        {hoverTooltipHandlers => (
          <div {...hoverTooltipHandlers}>
            <OutlineButton
              onClick={onPauseResumeClick}
              className={styles.run_button}
              disabled={pauseDisabled}
            >
              {pauseResumeText}
            </OutlineButton>
          </div>
        )}
      </HoverTooltip>
    )
    cancelButton = (
      <OutlineButton
        onClick={handleCancelClick}
        className={styles.run_button}
        disabled={controlsDisabled}
      >
        Cancel Run
      </OutlineButton>
    )
  } else {
    resetButton = (
      <OutlineButton
        onClick={onResetClick}
        className={styles.run_button}
        disabled={disabled}
      >
        Reset Run
      </OutlineButton>
    )
  }

  return (
    <>
      {runButton}
      {pauseResumeButton}
      {cancelButton}
      {resetButton}
      {isConfirmCancelOpen === true ? (
        <ConfirmCancelModal onClose={() => setConfirmCancelOpen(false)} />
      ) : null}
    </>
  )
}
