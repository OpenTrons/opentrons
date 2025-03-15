import { useMemo } from 'react'

import { useSearchLabwareOffsets } from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { RUN_STATUS_IDLE } from '@opentrons/api-client'

import { getUniqueValidLwLocationInfoByAnalysis } from './getUniqueValidLwLocationInfoByAnalysis'
import { getLPCLabwareInfoFrom } from './getLPCLabwareInfoFrom'
import { getLPCSearchParams } from './getLPCSearchParams'
import { useNotifyRunQuery, useRunStatus } from '/app/resources/runs'
import { useTrackEvent } from '/app/redux/analytics'

import type { LabwareOffset, StoredLabwareOffset } from '@opentrons/api-client'
import type { RobotType } from '@opentrons/shared-data'
import type { LPCLabwareInfo } from '/app/redux/protocol-runs'
import type { GetUniqueValidLwLocationInfoByAnalysisParams } from './getUniqueValidLwLocationInfoByAnalysis'

const REFETCH_OFFSET_SEARCH_MS = 5000

export type UseLPCLabwareInfoProps = GetUniqueValidLwLocationInfoByAnalysisParams & {
  runId: string
  robotType: RobotType
}

export interface UseLPCLabwareInfoResult {
  labwareInfo: LPCLabwareInfo
  storedOffsets: StoredLabwareOffset[]
  legacyOffsets: LabwareOffset[]
}

// Prepare LPC-able labware info for injection into LPC flows, querying for
// existing offsets in the process. Only relevant network requests and utilities
// are invoked depending on the robot type.
export function useLPCLabwareInfo(
  props: UseLPCLabwareInfoProps
): UseLPCLabwareInfoResult {
  const { legacyOffsets } = useOT2LPCLabwareInfo(props)
  const { labwareInfo, storedOffsets } = useFlexLPCLabwareInfo(props)

  return { storedOffsets, labwareInfo, legacyOffsets }
}

function useFlexLPCLabwareInfo({
  labwareDefs,
  protocolData,
  robotType,
  runId,
}: UseLPCLabwareInfoProps): Pick<
  UseLPCLabwareInfoResult,
  'labwareInfo' | 'storedOffsets'
> {
  const trackEvent = useTrackEvent()
  const runStatus = useRunStatus(runId)

  const lwLocationCombos = useMemo(
    () =>
      getUniqueValidLwLocationInfoByAnalysis({
        labwareDefs,
        protocolData,
        robotType,
        trackEvent,
        runId,
      }),
    [labwareDefs?.length, protocolData?.commands.length, robotType]
  )

  const searchLwOffsetsParams = useMemo(
    () => getLPCSearchParams(lwLocationCombos),
    [lwLocationCombos.length]
  )

  // TODO(jh, 03-14-25): Add this search route to notifications.

  // We have to poll, because it's possible for a user to update the
  // offsets on a different app while a view utilizing this data is active.
  const { data } = useSearchLabwareOffsets(searchLwOffsetsParams, {
    enabled:
      searchLwOffsetsParams.filters.length > 0 &&
      robotType === FLEX_ROBOT_TYPE &&
      runStatus === RUN_STATUS_IDLE,
    refetchInterval: REFETCH_OFFSET_SEARCH_MS,
  })
  const storedOffsets = data?.data ?? []

  const labwareInfo = useMemo(
    () =>
      getLPCLabwareInfoFrom({
        currentOffsets: storedOffsets,
        lwLocInfo: lwLocationCombos,
        labwareDefs,
        protocolData,
      }),
    [
      JSON.stringify(storedOffsets),
      labwareDefs?.length,
      lwLocationCombos.length,
    ]
  )

  return { labwareInfo, storedOffsets }
}

function useOT2LPCLabwareInfo({
  runId,
  robotType,
}: UseLPCLabwareInfoProps): Pick<UseLPCLabwareInfoResult, 'legacyOffsets'> {
  const { data: runRecord } = useNotifyRunQuery(runId, {
    staleTime: Infinity,
    enabled: robotType === OT2_ROBOT_TYPE,
  })
  const legacyOffsets = runRecord?.data?.labwareOffsets ?? []

  return { legacyOffsets }
}
