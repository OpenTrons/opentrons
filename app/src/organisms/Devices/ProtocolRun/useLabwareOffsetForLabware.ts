import { useRunQuery } from '@opentrons/react-api-client'
import { getLoadedLabwareDefinitionsByUri } from '@opentrons/shared-data'

import { getCurrentOffsetForLabwareInLocation } from '../../Devices/ProtocolRun/utils/getCurrentOffsetForLabwareInLocation'
import { getLabwareDefinitionUri } from '../../Devices/ProtocolRun/utils/getLabwareDefinitionUri'
import { getLabwareOffsetLocation } from '../../Devices/ProtocolRun/utils/getLabwareOffsetLocation'

import type { LabwareOffset } from '@opentrons/api-client'
import { useMostRecentCompletedAnalysis } from '../../LabwarePositionCheck/useMostRecentCompletedAnalysis'

export function useLabwareOffsetForLabware(
  runId: string,
  labwareId: string
): LabwareOffset | null {
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const { data: runRecord } = useRunQuery(runId)
  if (mostRecentAnalysis == null) return null

  const labwareDefinitionsByUri = getLoadedLabwareDefinitionsByUri(
    mostRecentAnalysis.commands
  )
  const labwareDefinitionUri = getLabwareDefinitionUri(
    labwareId,
    mostRecentAnalysis.labware,
    labwareDefinitionsByUri
  )

  const labwareLocation = getLabwareOffsetLocation(
    labwareId,
    mostRecentAnalysis?.commands ?? [],
    mostRecentAnalysis?.modules ?? []
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
