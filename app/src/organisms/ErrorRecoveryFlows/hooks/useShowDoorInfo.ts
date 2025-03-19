import {
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
} from '@opentrons/api-client'

import {
  GRIPPER_MOVE_STEPS,
  RECOVERY_MAP_METADATA,
  RECOVERY_MAP,
} from '../constants'

import type { RunStatus } from '@opentrons/api-client'
import type { ErrorRecoveryFlowsProps } from '../index'
import type { IRecoveryMap, RouteStep } from '../types'

const DOOR_OPEN_STATUSES: RunStatus[] = [
  RUN_STATUS_AWAITING_RECOVERY_BLOCKED_BY_OPEN_DOOR,
  RUN_STATUS_AWAITING_RECOVERY_PAUSED,
]

export interface UseShowDoorInfoResult {
  /* Whether the door actually open, regardless of whether a door open event is prohibited . */
  isDoorOpen: boolean
  /* Whether the door is open and prohibited to be open. */
  isProhibitedDoorOpen: boolean
}

// Whether the door is open and not permitted to be open or the user has not yet resumed the run after a door open event.
export function useShowDoorInfo(
  runStatus: ErrorRecoveryFlowsProps['runStatus'],
  recoveryMap: IRecoveryMap,
  currentStep: RouteStep
): UseShowDoorInfoResult {
  // TODO(jh, 07-16-24): "recovery paused" is only used for door status and therefore
  // a valid way to ensure all apps show the door open prompt, however this could be problematic in the future.
  // Consider restructuring this check once the takeover modals are added.
  const isDoorOpen = runStatus != null && DOOR_OPEN_STATUSES.includes(runStatus)
  const isProhibitedDoorOpen =
    isDoorOpen &&
    !isDoorPermittedOpen(recoveryMap) &&
    !GRIPPER_MOVE_STEPS.includes(currentStep)
  //    ||
  // recoveryMap.route === RECOVERY_MAP.MANUAL_REPLACE_STACKER_AND_RETRY.ROUTE

  return { isDoorOpen, isProhibitedDoorOpen }
}

function isDoorPermittedOpen(recoveryMap: IRecoveryMap): boolean {
  const { route, step } = recoveryMap
  if (route in RECOVERY_MAP_METADATA) {
    const routeConfig = RECOVERY_MAP_METADATA[route]

    if (step in routeConfig) {
      // @ts-expect-error Overly nested type that TS struggles to infer.
      return routeConfig[step].allowDoorOpen
    }
  }

  console.error(
    'Unexpected route/step combination when attempting to get door metadata for recovery map: ',
    recoveryMap
  )
  return false
}
