import { useNotifyAllRunsQuery } from '/app/resources/runs/useNotifyAllRunsQuery'

import type { HostConfig, RunData } from '@opentrons/api-client'
import type { UseNotifyAllRunsQueryOptions } from '/app/resources/runs/useNotifyAllRunsQuery'

export function useHistoricRunDetails(
  hostOverride?: HostConfig | null,
  queryOptions?: UseNotifyAllRunsQueryOptions
): RunData[] {
  const { data: allHistoricRuns } = useNotifyAllRunsQuery(
    {},
    queryOptions,
    hostOverride
  )
  return allHistoricRuns == null
    ? []
    : // TODO(sf): figure out why .toSorted() doesn't work in vitest
      allHistoricRuns.data
        .map(t => t)
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
}
