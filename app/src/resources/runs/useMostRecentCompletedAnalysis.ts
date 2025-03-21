import last from 'lodash/last'
import {
  useProtocolAnalysisAsDocumentQuery,
  useProtocolQuery,
} from '@opentrons/react-api-client'

import { useNotifyRunQuery } from '/app/resources/runs'

import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'

export function useMostRecentCompletedAnalysis(
  runId: string | null
): CompletedProtocolAnalysis | null {
  const { data: runRecord } = useNotifyRunQuery(runId ?? null)
  const protocolId = runRecord?.data?.protocolId ?? null
  const { data: protocolData } = useProtocolQuery(protocolId, {
    enabled: protocolId != null,
  })
  const { data: analysis } = useProtocolAnalysisAsDocumentQuery(
    protocolId,
    last(protocolData?.data.analysisSummaries)?.id ?? null,
    { enabled: protocolData != null }
  )

  return analysis != null
    ? {
        ...analysis,
        // NOTE: this is accounting for pre 7.1 robot-side protocol analysis that may not include the robotType key
        robotType: analysis.robotType ?? protocolData?.data.robotType,
      }
    : null
}
