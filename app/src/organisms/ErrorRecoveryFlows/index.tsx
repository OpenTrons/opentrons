import * as React from 'react'
import { useSelector } from 'react-redux'

import {
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_FAILED,
  RUN_STATUS_IDLE,
  RUN_STATUS_PAUSED,
  RUN_STATUS_RUNNING,
  RUN_STATUS_STOP_REQUESTED,
  RUN_STATUS_SUCCEEDED,
} from '@opentrons/api-client'
import { OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { getIsOnDevice } from '../../redux/config'
import { ErrorRecoveryWizard, useERWizard } from './ErrorRecoveryWizard'
import { RunPausedSplash, useRunPausedSplash } from './RunPausedSplash'
import {
  useCurrentlyRecoveringFrom,
  useERUtils,
  useRecoveryAnalytics,
  useShowDoorInfo,
} from './hooks'

import type { RunStatus } from '@opentrons/api-client'
import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'
import type { FailedCommand } from './types'

const VALID_ER_RUN_STATUSES: RunStatus[] = [
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
  RUN_STATUS_STOP_REQUESTED,
]

const INVALID_ER_RUN_STATUSES: RunStatus[] = [
  RUN_STATUS_RUNNING,
  RUN_STATUS_PAUSED,
  RUN_STATUS_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_FAILED,
  RUN_STATUS_SUCCEEDED,
  RUN_STATUS_IDLE,
]

interface UseErrorRecoveryResult {
  isERActive: boolean
  /* There is no FailedCommand if the run statis is not AWAITING_RECOVERY. */
  failedCommand: FailedCommand | null
}

export function useErrorRecoveryFlows(
  runId: string,
  runStatus: RunStatus | null
): UseErrorRecoveryResult {
  const [isERActive, setIsERActive] = React.useState(false)
  // If client accesses a valid ER runs status besides AWAITING_RECOVERY but accesses it outside of Error Recovery flows, don't show ER.
  const [hasSeenAwaitingRecovery, setHasSeenAwaitingRecovery] = React.useState(
    false
  )
  const failedCommand = useCurrentlyRecoveringFrom(runId, runStatus)

  if (
    !hasSeenAwaitingRecovery &&
    ([
      RUN_STATUS_AWAITING_RECOVERY,
      RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
      RUN_STATUS_AWAITING_RECOVERY_PAUSED,
    ] as Array<RunStatus | null>).includes(runStatus)
  ) {
    setHasSeenAwaitingRecovery(true)
  }
  // Reset recovery mode after the client has exited recovery, otherwise "cancel run" will trigger ER after the first recovery.
  else if (
    hasSeenAwaitingRecovery &&
    runStatus != null &&
    INVALID_ER_RUN_STATUSES.includes(runStatus)
  ) {
    setHasSeenAwaitingRecovery(false)
  }

  const isValidRunStatus =
    runStatus != null &&
    VALID_ER_RUN_STATUSES.includes(runStatus) &&
    hasSeenAwaitingRecovery

  if (!isERActive && isValidRunStatus && failedCommand != null) {
    setIsERActive(true)
  }
  // Because multiple ER flows may occur per run, disable ER when the status is not "awaiting-recovery" or a
  // terminating run status in which we want to persist ER flows. Specific recovery commands cause run status to change.
  // See a specific command's docstring for details.
  // ER handles a null failedCommand outside the splash screen, so we shouldn't set it false here.
  else if (isERActive && !isValidRunStatus) {
    setIsERActive(false)
  }

  return {
    isERActive,
    failedCommand,
  }
}

export interface ErrorRecoveryFlowsProps {
  runId: string
  runStatus: RunStatus | null
  failedCommand: FailedCommand | null
  protocolAnalysis: CompletedProtocolAnalysis | null
}

export function ErrorRecoveryFlows(
  props: ErrorRecoveryFlowsProps
): JSX.Element | null {
  const { protocolAnalysis, runStatus, failedCommand } = props

  const { hasLaunchedRecovery, toggleERWizard, showERWizard } = useERWizard()

  const isOnDevice = useSelector(getIsOnDevice)
  const robotType = protocolAnalysis?.robotType ?? OT2_ROBOT_TYPE
  const showSplash = useRunPausedSplash(isOnDevice, showERWizard)
  const analytics = useRecoveryAnalytics()

  React.useEffect(() => {
    analytics.reportErrorEvent(failedCommand)
  }, [failedCommand])

  const isDoorOpen = useShowDoorInfo(runStatus)

  const recoveryUtils = useERUtils({
    ...props,
    hasLaunchedRecovery,
    toggleERWizard,
    isOnDevice,
    robotType,
    analytics,
  })

  return (
    <>
      {showERWizard || isDoorOpen ? (
        <ErrorRecoveryWizard
          {...props}
          {...recoveryUtils}
          robotType={robotType}
          isOnDevice={isOnDevice}
          isDoorOpen={isDoorOpen}
          analytics={analytics}
        />
      ) : null}
      {showSplash ? (
        <RunPausedSplash
          {...props}
          {...recoveryUtils}
          robotType={robotType}
          isOnDevice={isOnDevice}
          toggleERWiz={toggleERWizard}
          analytics={analytics}
        />
      ) : null}
    </>
  )
}
