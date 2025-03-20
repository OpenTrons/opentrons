import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisSummary,
  RunTimeCommand,
} from '@opentrons/shared-data'
import {
  ANALYTICS_LPC_ANALYSIS_KIND,
  useTrackEvent,
} from '/app/redux/analytics'
import { useEffect, useRef, useState } from 'react'
import {
  useCreateProtocolAnalysisMutation,
  useProtocolAnalysisAsDocumentQuery,
} from '@opentrons/react-api-client'
import { useNotifyRunQuery } from '/app/resources/runs'

// TODO(jh, 03-17-25): Add testing here.

// TODO(jh, 03-14-25): Remove this adapter logic and Mixpanel event once analytics
//  indicate that users no longer run old analyses.

// If analysis is incompatible with LPC, force reanalysis and use that fresh analysis,
// otherwise, use the current analysis.
export function useCompatibleAnalysis(
  runId: string,
  mostRecentAnalysis: CompletedProtocolAnalysis | null
): CompletedProtocolAnalysis | null {
  const [
    compatibleAnalysis,
    setCompatibleAnalysis,
  ] = useState<CompletedProtocolAnalysis | null>(null)
  const [compatibleAnalysisId, setCompatibleAnalysisId] = useState<
    string | null
  >(null)
  const hasProcessedAnalysis = useRef(false)

  const trackEvent = useTrackEvent()
  const protocolId = useNotifyRunQuery(runId).data?.data.protocolId ?? ''
  const { createProtocolAnalysis } = useCreateProtocolAnalysisMutation(
    protocolId
  )
  const { data: freshAnalysis } = useProtocolAnalysisAsDocumentQuery(
    protocolId,
    compatibleAnalysisId,
    {
      enabled: compatibleAnalysisId != null,
      staleTime: Infinity,
    }
  )

  if (compatibleAnalysis == null && freshAnalysis != null) {
    setCompatibleAnalysis(freshAnalysis)
  }

  const isLocSeqAnalysisType = isLocationSequenceAnalysisType(
    mostRecentAnalysis?.commands ?? []
  )

  useEffect(() => {
    if (mostRecentAnalysis != null && !hasProcessedAnalysis.current) {
      hasProcessedAnalysis.current = true

      if (!isLocSeqAnalysisType) {
        createProtocolAnalysis(
          {
            forceReAnalyze: true,
            protocolKey: protocolId,
          },
          {
            onSuccess: res => {
              if (res != null) {
                // @ts-expect-error TODO(jh, 03-17-25): Something is wrong with the typing here.
                const data = res.data as ProtocolAnalysisSummary[]
                // The last analysis is the most recent.
                setCompatibleAnalysisId(data[data.length - 1].id)
              }
            },
          }
        )
      } else {
        setCompatibleAnalysis(mostRecentAnalysis)
      }

      trackEvent({
        name: ANALYTICS_LPC_ANALYSIS_KIND,
        properties: {
          runId,
          kind: isLocSeqAnalysisType ? 'newAnalysis' : 'oldAnalysis',
        },
      })
    }
  }, [
    mostRecentAnalysis,
    isLocSeqAnalysisType,
    protocolId,
    runId,
    trackEvent,
    createProtocolAnalysis,
  ])

  return compatibleAnalysis
}

// Whether the internal structure of the analysis commands reflects an LPC-compatible analysis.
function isLocationSequenceAnalysisType(commands: RunTimeCommand[]): boolean {
  return commands.some(cmd => {
    switch (cmd.commandType) {
      case 'loadLabware':
      case 'moveLabware': {
        if (cmd.result != null && 'locationSequence' in cmd.result) {
          return true
        }
        break
      }
      // If we see these commands, we can assume we are dealing with location sequence protocols.
      case 'flexStacker/setStoredLabware':
      case 'flexStacker/retrieve': {
        return true
      }
    }
    return false
  })
}
