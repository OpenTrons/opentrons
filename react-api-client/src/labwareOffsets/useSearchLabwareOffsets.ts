import { useQuery } from 'react-query'

import { searchLabwareOffsets } from '@opentrons/api-client'

import { useHost } from '../api'

import type { UseQueryOptions, UseQueryResult } from 'react-query'
import type { AxiosError } from 'axios'
import type {
  HostConfig,
  SearchLabwareOffsetsData,
  SearchLabwareOffsetsResponse,
} from '@opentrons/api-client'

export function useSearchLabwareOffsets(
  data: SearchLabwareOffsetsData,
  options: UseQueryOptions<SearchLabwareOffsetsResponse, AxiosError> = {}
): UseQueryResult<SearchLabwareOffsetsResponse, AxiosError> {
  const host = useHost()
  const query = useQuery<SearchLabwareOffsetsResponse, AxiosError>(
    [host, 'searchLabwareOffsets', data],
    () =>
      searchLabwareOffsets(host as HostConfig, data)
        .then(response => response.data)
        .catch((e: AxiosError) => {
          throw e
        }),
    { enabled: host !== null, ...options }
  )

  return query
}
