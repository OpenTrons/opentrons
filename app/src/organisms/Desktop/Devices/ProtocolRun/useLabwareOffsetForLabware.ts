import { getLoadedLabwareDefinitionsByUri } from '@opentrons/shared-data'

import { getLabwareDefinitionUri } from '/app/transformations/protocols'
import {
  getLegacyLabwareOffsetLocation,
  getCurrentOffsetForLabwareInLocation,
} from '/app/transformations/analysis'
import {
  useNotifyRunQuery,
  useMostRecentCompletedAnalysis,
} from '/app/resources/runs'

import type { LabwareOffset } from '@opentrons/api-client'

export function useLabwareOffsetForLabware(
  runId: string,
  labwareId: string
): LabwareOffset | null {
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const { data: runRecord } = useNotifyRunQuery(runId)
  if (mostRecentAnalysis == null) return null

  const labwareDefinitionsByUri = getLoadedLabwareDefinitionsByUri(
    mostRecentAnalysis.commands
  )
  const labwareDefinitionUri = getLabwareDefinitionUri(
    labwareId,
    mostRecentAnalysis.labware,
    labwareDefinitionsByUri
  )

  const labwareLocation = getLegacyLabwareOffsetLocation(
    labwareId,
    mostRecentAnalysis?.commands ?? [],
    mostRecentAnalysis?.modules ?? [],
    mostRecentAnalysis?.labware ?? []
  )
  if (labwareLocation == null || labwareDefinitionUri == null) return null
  const labwareOffsets = runRecord?.data?.labwareOffsets ?? []

  return (
    getCurrentOffsetForLabwareInLocation(
      labwareOffsets,
      labwareDefinitionUri,
      labwareLocation
    ) ?? null
  )
}
