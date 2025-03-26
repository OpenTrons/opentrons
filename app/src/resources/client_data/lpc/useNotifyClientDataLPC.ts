import { useClientData } from '@opentrons/react-api-client'

import { KEYS } from '../constants'
import { useNotifyDataReady } from '../../useNotifyDataReady'

import type { UseQueryResult } from 'react-query'
import type { AxiosError } from 'axios'
import type { ClientDataResponse } from '@opentrons/api-client'
import type { ClientDataLPC } from './types'
import type { QueryOptionsWithPolling } from '../../useNotifyDataReady'

export function useNotifyClientDataLPC(
  options: QueryOptionsWithPolling<
    ClientDataResponse<ClientDataLPC>,
    AxiosError
  > = {}
): UseQueryResult<ClientDataResponse<ClientDataLPC>, AxiosError> {
  const { shouldRefetch, queryOptionsNotify } = useNotifyDataReady({
    topic: `robot-server/clientData/${KEYS.LPC}`,
    options,
  })

  const httpQueryResult = useClientData<ClientDataLPC>(
    KEYS.LPC,
    queryOptionsNotify
  )

  if (shouldRefetch) {
    void httpQueryResult.refetch()
  }

  return httpQueryResult
}
