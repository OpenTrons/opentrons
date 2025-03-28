import { useQuery } from 'react-query'

import { getLabwareOffsets } from '@opentrons/api-client'

import { useHost } from '../api'

import type { UseQueryOptions, UseQueryResult } from 'react-query'
import type { AxiosError } from 'axios'
import type {
  HostConfig,
  LabwareOffsetsResponse,
  LabwareOffsetsSearchParams,
} from '@opentrons/api-client'

export function useLabwareOffsets(
  params: LabwareOffsetsSearchParams = {},
  options: UseQueryOptions<LabwareOffsetsResponse, AxiosError> = {}
): UseQueryResult<LabwareOffsetsResponse, AxiosError> {
  const host = useHost()
  const query = useQuery<LabwareOffsetsResponse, AxiosError>(
    [host, 'labwareOffsets', params],
    () =>
      getLabwareOffsets(host as HostConfig, params)
        .then(response => response.data)
        .catch((e: AxiosError) => {
          throw e
        }),
    { enabled: host !== null, ...options }
  )

  return query
}
