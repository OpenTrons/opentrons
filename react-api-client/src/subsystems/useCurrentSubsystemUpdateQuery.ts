import { useQuery, useQueryClient } from 'react-query'

import { getCurrentSubsystemUpdate } from '@opentrons/api-client'
import { useHost } from '../api'

import type { UseQueryResult, UseQueryOptions } from 'react-query'
import type {
  HostConfig,
  Subsystem,
  SubsystemUpdateProgressData,
} from '@opentrons/api-client'

export function useCurrentSubsystemUpdateQuery<TError = Error>(
  subsystem: string | null,
  options: UseQueryOptions<SubsystemUpdateProgressData, TError> = {}
): UseQueryResult<SubsystemUpdateProgressData, TError> {
  const host = useHost()
  const queryClient = useQueryClient()
  const query = useQuery<SubsystemUpdateProgressData, TError>(
    [host, '/subsystems/updates/current', subsystem],
    () =>
      getCurrentSubsystemUpdate(
        host as HostConfig,
        subsystem as Subsystem
      ).then(response => response.data),
    {
      ...options,
      enabled: host !== null,
      onError: () => {
        queryClient.resetQueries([
          host,
          '/subsystems/updates/current',
          subsystem,
        ])
      },
    }
  )

  return query
}
