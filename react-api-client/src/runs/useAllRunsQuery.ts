import { GetRunsParams, HostConfig, Runs, getRuns } from '@opentrons/api-client'
import { useQuery } from 'react-query'
import { useHost } from '../api'

import type { UseQueryOptions, UseQueryResult } from 'react-query'

export type UseAllRunsQueryOptions = UseQueryOptions<
  Runs,
  Error,
  Runs,
  Array<string | HostConfig>
>

export function useAllRunsQuery(
  params: GetRunsParams = {},
  options: UseAllRunsQueryOptions = {},
  hostOverride?: HostConfig | null
): UseQueryResult<Runs> {
  const contextHost = useHost()
  const host = hostOverride ?? contextHost
  const query = useQuery(
    [host as HostConfig, 'runs', 'details'],
    () => getRuns(host as HostConfig, params).then(response => response.data),
    { enabled: host !== null, ...options }
  )

  return query
}
