import { useEffect } from 'react'
import { updateLPC } from '/app/redux/protocol-runs'
import { useDispatch, useSelector } from 'react-redux'

import type { State } from '/app/redux/types'
import type { DeckConfiguration } from '@opentrons/shared-data'

export function useUpdateDeckConfig(
  runId: string | null,
  deckConfig: DeckConfiguration | undefined
): void {
  const dispatch = useDispatch()
  const lpcState = useSelector(
    (state: State) => state?.protocolRuns[runId ?? '']?.lpc
  )

  useEffect(() => {
    if (lpcState != null && runId != null) {
      const updatedState = {
        ...lpcState,
        deckConfig: deckConfig ?? lpcState.deckConfig,
      }

      dispatch(updateLPC(runId, updatedState))
    }
  }, [deckConfig])
}
