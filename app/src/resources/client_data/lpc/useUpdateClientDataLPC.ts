import { useUpdateClientData } from '@opentrons/react-api-client'
import { useSelector } from 'react-redux'

import { getUserId } from '/app/redux/config'
import { KEYS } from '../constants'

import type {
  UseUpdateClientDataMutationOptions,
  UseUpdateClientDataMutationResult,
} from '@opentrons/react-api-client'
import type { ClientDataLPC } from './types'

export type UseUpdateClientDataLPCResult = Omit<
  UseUpdateClientDataMutationResult<ClientDataLPC>,
  'updateClientData'
> & {
  /* Update the server with the user's id and a runId. */
  updateWithRunId: (runId: ClientDataLPC['runId']) => void
  /* Clear the clientData store at the runId. */
  clearClientData: () => void
}

// Update the client data store value associated with the runId.
export function useUpdateClientLPC(
  options: UseUpdateClientDataMutationOptions<ClientDataLPC> = {}
): UseUpdateClientDataLPCResult {
  const { updateClientData, ...mutate } = useUpdateClientData<ClientDataLPC>(
    KEYS.LPC,
    options
  )
  const thisUserId = useSelector(getUserId)

  const updateWithRunId = (runId: ClientDataLPC['runId']): void => {
    updateClientData({ userId: thisUserId, runId })
  }

  const clearClientData = (): void => {
    updateClientData({ userId: null, runId: null })
  }

  return {
    ...mutate,
    updateWithRunId,
    clearClientData,
  }
}
