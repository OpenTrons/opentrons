import { useEffect } from 'react'
import { updateLPCDeck } from '/app/redux/protocol-runs'
import { useDispatch } from 'react-redux'

import type { DeckConfiguration } from '@opentrons/shared-data'

// The deck config may change after LPC state initialization, and LPC needs to account
// for those changes.
export function useUpdateDeckConfig(
  runId: string | null,
  deckConfig: DeckConfiguration | undefined
): void {
  const dispatch = useDispatch()

  useEffect(() => {
    if (runId != null && deckConfig != null) {
      dispatch(updateLPCDeck(runId, deckConfig))
    }
  }, [deckConfig])
}
