import { useDispatch, useSelector } from 'react-redux'
import { useEffect } from 'react'
import {
  useClientDataLPC,
  useUpdateClientLPC,
} from '/app/resources/client_data/'
import {
  appliedOffsetsToRun,
  selectAreOffsetsApplied,
} from '/app/redux/protocol-runs'
import { useIsRunCurrent } from '/app/resources/runs'

const CLIENT_DATA_INTERVAL_MS = 5000

// Keep the applied offset state in sync between various apps using the same robot.
export function useHandleClientAppliedOffsets(thisRunId: string | null): void {
  const dispatch = useDispatch()
  const areOffsetsApplied = useSelector(
    selectAreOffsetsApplied(thisRunId ?? '')
  )
  const isThisRunCurrent = useIsRunCurrent(thisRunId)

  const { clearClientData, updateWithRunId } = useUpdateClientLPC()
  const { runId: clientDataRunId, userId: clientDataUserId } = useClientDataLPC(
    {
      refetchInterval: CLIENT_DATA_INTERVAL_MS,
    }
  )

  useEffect(() => {
    if (isThisRunCurrent) {
      if (clientDataRunId !== thisRunId && clientDataRunId != null) {
        clearClientData()
      }
      // Offsets applied locally but not by another user - update client data
      else if (areOffsetsApplied && clientDataUserId == null) {
        updateWithRunId(thisRunId)
      }
      // Offsets applied by another user but not locally - mark as applied locally
      else if (
        clientDataUserId != null &&
        !areOffsetsApplied &&
        thisRunId != null
      ) {
        dispatch(appliedOffsetsToRun(thisRunId))
      }
    } else {
      if (clientDataRunId === thisRunId) {
        clearClientData()
      }
    }
  }, [
    isThisRunCurrent,
    clientDataRunId,
    areOffsetsApplied,
    clientDataUserId,
    thisRunId,
  ])
}
