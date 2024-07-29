import { useClientData } from '@opentrons/react-api-client'

import { KEYS } from '../constants'
import { useNotifyDataReady } from '../../useNotifyDataReady'

import type { UseQueryOptions, UseQueryResult } from 'react-query'
import type { AxiosError } from 'axios'
import type { ClientDataResponse } from '@opentrons/api-client'
import type { ClientDataRecovery } from './types'

export function useNotifyClientDataRecovery(
  options: UseQueryOptions<
    ClientDataResponse<ClientDataRecovery>,
    AxiosError
  > = {}
): UseQueryResult<ClientDataResponse<ClientDataRecovery>, AxiosError> {
  const { notifyOnSettled, shouldRefetch } = useNotifyDataReady({
    topic: `robot-server/clientData/${KEYS.ERROR_RECOVERY}`,
    options,
  })

  const httpQueryResult = useClientData<ClientDataRecovery>(
    KEYS.ERROR_RECOVERY,
    {
      ...options,
      enabled: options?.enabled !== false && shouldRefetch,
      onSettled: notifyOnSettled,
    }
  )

  return httpQueryResult
}
