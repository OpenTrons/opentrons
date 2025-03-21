import { useSearchLabwareOffsets } from '@opentrons/react-api-client'

import { useNotifyDataReady } from '../useNotifyDataReady'

import type {
  SearchLabwareOffsetsRequest,
  SearchLabwareOffsetsResponse,
} from '@opentrons/api-client'
import type { AxiosError } from 'axios'
import type { UseQueryResult } from 'react-query'
import type { QueryOptionsWithPolling } from '../useNotifyDataReady'

export function useNotifySearchLabwareOffsets(
  request: SearchLabwareOffsetsRequest,
  options: QueryOptionsWithPolling<
    SearchLabwareOffsetsResponse,
    AxiosError
  > = {}
): UseQueryResult<SearchLabwareOffsetsResponse> {
  const { shouldRefetch, queryOptionsNotify } = useNotifyDataReady({
    topic: 'robot-server/labwareOffsets',
    options,
  })
  console.error('MAX: useNotifySearchLabwareOffsets', {
    request,
    options,
    shouldRefetch,
    queryOptionsNotify,
  })

  const httpQueryResult = useSearchLabwareOffsets(request, queryOptionsNotify)

  if (shouldRefetch) {
    void httpQueryResult.refetch()
  }

  return httpQueryResult
}
