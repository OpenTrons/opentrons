import {
  RUN_STATUS_AWAITING_RECOVERY,
  RUN_STATUS_FAILED,
  RUN_STATUS_IDLE,
  RUN_STATUS_PAUSED,
  RUN_STATUS_RUNNING,
  RUN_STATUS_STOPPED,
  RUN_STATUS_SUCCEEDED,
} from '@opentrons/api-client'
import { useCurrentRunId } from '../../ProtocolUpload/hooks'
import { useRunStatus } from '../../RunTimeControl/hooks'

interface RunStatusesInfo {
  isRunStill: boolean
  isRunTerminal: boolean
  isRunIdle: boolean
  isRunRunning: boolean
}

export function useRunStatuses(): RunStatusesInfo {
  const currentRunId = useCurrentRunId()
  const runStatus = useRunStatus(currentRunId)
  const isRunIdle = runStatus === RUN_STATUS_IDLE
  const isRunRunning =
    // todo(mm, 2024-03-13): Does this intentionally exclude
    // RUN_STATUS_FINISHING, RUN_STATUS_STOP_REQUESTED,
    // and RUN_STATUS_BLOCKED_BY_OPEN_DOOR?
    runStatus === RUN_STATUS_PAUSED ||
    runStatus === RUN_STATUS_RUNNING ||
    runStatus === RUN_STATUS_AWAITING_RECOVERY
  const isRunTerminal =
    runStatus === RUN_STATUS_SUCCEEDED ||
    runStatus === RUN_STATUS_STOPPED ||
    runStatus === RUN_STATUS_FAILED
  const isRunStill = isRunTerminal || isRunIdle

  return { isRunStill, isRunTerminal, isRunIdle, isRunRunning }
}
