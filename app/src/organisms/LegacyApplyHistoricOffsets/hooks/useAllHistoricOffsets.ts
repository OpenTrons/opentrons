import { useHistoricRunDetails } from './useHistoricRunDetails'

import type { LabwareOffset, HostConfig } from '@opentrons/api-client'
import type { UseNotifyAllRunsQueryOptions } from '/app/resources/runs'

interface HistoricOffset extends LabwareOffset {
  runCreatedAt: string
}
export function useAllHistoricOffsets(
  hostOverride?: HostConfig | null,
  queryOptions?: UseNotifyAllRunsQueryOptions
): HistoricOffset[] {
  const historicRunDetails = useHistoricRunDetails(hostOverride, queryOptions)
  return historicRunDetails
    .map(
      run =>
        run.labwareOffsets
          ?.map(offset => ({
            ...offset,
            runCreatedAt: run.createdAt,
          }))
          ?.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ) ?? []
    )
    .flat()
}
