import {
  useAllSessionsQuery,
  useAllRunsQuery,
  useEstopQuery,
  useHost,
} from '@opentrons/react-api-client'
import { DISENGAGED } from '../../EmergencyStop'
import { useIsOT3 } from './useIsOT3'

const ROBOT_STATUS_POLL_MS = 30000

interface UseIsRobotBusyOptions {
  poll: boolean
}
export function useIsRobotBusy(
  options: UseIsRobotBusyOptions = { poll: false }
): boolean {
  const { poll } = options
  const queryOptions = poll ? { refetchInterval: ROBOT_STATUS_POLL_MS } : {}
  const robotHasCurrentRun =
    useAllRunsQuery({}, queryOptions)?.data?.links?.current != null
  const allSessionsQueryResponse = useAllSessionsQuery(queryOptions)
  const host = useHost()
  const robotName = host?.robotName
  const isOT3 = useIsOT3(robotName ?? '')
  const { data: estopStatus, error: estopError } = useEstopQuery({
    ...queryOptions,
    enabled: isOT3,
  })

  return (
    robotHasCurrentRun ||
    (allSessionsQueryResponse?.data?.data != null &&
      allSessionsQueryResponse?.data?.data?.length !== 0) ||
    (isOT3 && estopStatus?.data.status !== DISENGAGED && estopError == null)
  )
}
