import { useNotifyClientDataLPC } from './useNotifyClientDataLPC'

import type { AxiosError } from 'axios'
import type { ClientDataResponse } from '@opentrons/api-client'
import type { ClientDataLPC } from './types'
import type { QueryOptionsWithPolling } from '/app/resources/useNotifyDataReady'

// Returns the client data store value associated with the runId, if any.
export function useClientDataLPC(
  options: QueryOptionsWithPolling<
    ClientDataResponse<ClientDataLPC>,
    AxiosError
  > = {}
): ClientDataLPC {
  const { data } = useNotifyClientDataLPC(options)

  const { userId: userIdResponse, runId } = data?.data ?? {}
  const userId =
    userIdResponse != null && userIdResponse.length > 0 ? userIdResponse : null

  return { userId, runId: runId ?? null }
}
