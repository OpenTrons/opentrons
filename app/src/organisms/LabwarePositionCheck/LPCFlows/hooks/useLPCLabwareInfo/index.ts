import { useMemo } from 'react'

import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'
import { RUN_STATUS_IDLE } from '@opentrons/api-client'

import { getUniqueValidLwLocationInfoByAnalysis } from './getUniqueValidLwLocationInfoByAnalysis'
import { getLPCLabwareInfoFrom } from './getLPCLabwareInfoFrom'
import { getLPCSearchParams } from './getLPCSearchParams'
import { useNotifySearchLabwareOffsets } from '/app/resources/labware_offsets'
import { useNotifyRunQuery, useRunStatus } from '/app/resources/runs'

import type { LabwareOffset, StoredLabwareOffset } from '@opentrons/api-client'
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

  const { data: lwOffsetsData } = useNotifySearchLabwareOffsets(
    searchLwOffsetsParams,
    {
      enabled: runStatus === RUN_STATUS_IDLE && robotType === FLEX_ROBOT_TYPE,
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

  return { labwareInfo, storedOffsets }
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
