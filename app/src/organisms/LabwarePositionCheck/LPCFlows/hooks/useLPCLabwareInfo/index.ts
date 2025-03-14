import { useMemo } from 'react'

import { useSearchLabwareOffsets } from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE, OT2_ROBOT_TYPE } from '@opentrons/shared-data'

import { getUniqueValidLwLocationInfoByAnalysis } from './getUniqueValidLwLocationInfoByAnalysis'
import { getLPCLabwareInfoFrom } from './getLPCLabwareInfoFrom'
import { getLPCSearchParams } from './getLPCSearchParams'
import { useNotifyRunQuery } from '/app/resources/runs'

import type { LabwareOffset, StoredLabwareOffset } from '@opentrons/api-client'
import type { RobotType } from '@opentrons/shared-data'
import type { LPCLabwareInfo } from '/app/redux/protocol-runs'
import type { GetUniqueValidLwLocationInfoByAnalysisParams } from './getUniqueValidLwLocationInfoByAnalysis'

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
}: UseLPCLabwareInfoProps): Pick<
  UseLPCLabwareInfoResult,
  'labwareInfo' | 'storedOffsets'
> {
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

  const { data } = useSearchLabwareOffsets(searchLwOffsetsParams, {
    enabled:
      searchLwOffsetsParams.filters.length > 0 && robotType === FLEX_ROBOT_TYPE,
    staleTime: Infinity,
  })

  const storedOffsets = data?.data ?? []

  const labwareInfo = useMemo(
    () =>
      getLPCLabwareInfoFrom({
        currentOffsets: storedOffsets,
        lwLocationCombos,
        labwareDefs,
      }),
    [storedOffsets.length, labwareDefs?.length, lwLocationCombos.length]
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
