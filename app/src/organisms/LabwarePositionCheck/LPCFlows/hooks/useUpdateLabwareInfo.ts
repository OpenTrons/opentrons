import { useEffect } from 'react'
import { updateLPCLabware } from '/app/redux/protocol-runs'
import { useDispatch } from 'react-redux'

import type { LPCLabwareInfo } from '/app/redux/protocol-runs'

// Update the store with new labware info when this app is *not* the app actively
// performing LPC.
export function useUpdateLabwareInfo(
  runId: string | null,
  maintenanceRunId: string | null,
  labwareInfo: LPCLabwareInfo
): void {
  const dispatch = useDispatch()

  useEffect(() => {
    if (runId != null && maintenanceRunId == null) {
      dispatch(updateLPCLabware(runId, labwareInfo))
    }
  }, [labwareInfo, maintenanceRunId])
}
