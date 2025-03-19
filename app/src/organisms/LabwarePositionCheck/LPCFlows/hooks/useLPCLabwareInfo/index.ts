import { useMemo } from 'react'

import { useSearchLabwareOffsets } from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { RUN_STATUS_IDLE } from '@opentrons/api-client'

import { getUniqueValidLwLocationInfoByAnalysis } from './getUniqueValidLwLocationInfoByAnalysis'
import { getLPCLabwareInfoFrom } from './getLPCLabwareInfoFrom'
import { getLPCSearchParams } from './getLPCSearchParams'
import { useNotifyRunQuery, useRunStatus } from '/app/resources/runs'

import type {
  LabwareOffset,
  StoredLabwareOffset,
  SearchLabwareOffsetsData,
} from '@opentrons/api-client'
import type { RobotType } from '@opentrons/shared-data'
import type { LPCLabwareInfo } from '/app/redux/protocol-runs'
import type { GetUniqueValidLwLocationInfoByAnalysisParams } from './getUniqueValidLwLocationInfoByAnalysis'

const REFETCH_OFFSET_SEARCH_MS = 5000

export type UseLPCLabwareInfoProps = GetUniqueValidLwLocationInfoByAnalysisParams & {
  runId: string | null
  robotType: RobotType
}

export interface UseLPCLabwareInfoResult {
  labwareInfo: LPCLabwareInfo
  storedOffsets: StoredLabwareOffset[] | undefined
  legacyOffsets: LabwareOffset[]
  searchLwOffsetsParams: SearchLabwareOffsetsData
}

// Prepare LPC-able labware info for injection into LPC flows, querying for
// existing offsets in the process. Only relevant network requests and utilities
// are invoked depending on the robot type.
export function useLPCLabwareInfo(
  props: UseLPCLabwareInfoProps
): UseLPCLabwareInfoResult {
  const { legacyOffsets } = useOT2LPCLabwareInfo(props)
  const {
    labwareInfo,
    storedOffsets,
    searchLwOffsetsParams,
  } = useFlexLPCLabwareInfo(props)

  return { storedOffsets, labwareInfo, legacyOffsets, searchLwOffsetsParams }
}

function useFlexLPCLabwareInfo({
  labwareDefs,
  protocolData,
  robotType,
  runId,
}: UseLPCLabwareInfoProps): Pick<
  UseLPCLabwareInfoResult,
  'labwareInfo' | 'storedOffsets' | 'searchLwOffsetsParams'
> {
  const runStatus = useRunStatus(runId ?? null)

  const lwLocationCombos = useMemo(
    () =>
      getUniqueValidLwLocationInfoByAnalysis({
        labwareDefs,
        protocolData,
        robotType,
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
  const { data: lwOffsetsData } = useSearchLabwareOffsets(
    searchLwOffsetsParams,
    {
      enabled:
        searchLwOffsetsParams.filters.length > 0 &&
        robotType === FLEX_ROBOT_TYPE &&
        runStatus === RUN_STATUS_IDLE,
      refetchInterval: REFETCH_OFFSET_SEARCH_MS,
    }
  )
  const storedOffsets = lwOffsetsData?.data

  const labwareInfo = useMemo(
    () =>
      getLPCLabwareInfoFrom({
        currentOffsets: storedOffsets,
        lwLocInfo: lwLocationCombos,
        labwareDefs,
        protocolData,
      }),
    [storedOffsets, labwareDefs, lwLocationCombos, protocolData]
  )

  return { labwareInfo, storedOffsets, searchLwOffsetsParams }
}

function useOT2LPCLabwareInfo({
  runId,
  robotType,
}: UseLPCLabwareInfoProps): Pick<UseLPCLabwareInfoResult, 'legacyOffsets'> {
  const { data: runRecord } = useNotifyRunQuery(runId ?? null, {
    enabled: robotType === OT2_ROBOT_TYPE,
  })
  const legacyOffsets = runRecord?.data?.labwareOffsets ?? []

  return { legacyOffsets }
}
