import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { getLPCUniqValidLabwareLocationInfo } from './getLPCUniqValidLabwareLocationInfo'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  RobotType,
} from '@opentrons/shared-data'
import type { LabwareLocationInfo } from '/app/redux/protocol-runs'

export interface GetUniqueValidLwLocationInfoByAnalysisParams {
  protocolData: CompletedProtocolAnalysis | null
  labwareDefs: LabwareDefinition2[] | null
}

export function getUniqueValidLwLocationInfoByAnalysis({
  labwareDefs,
  protocolData,
  robotType,
}: GetUniqueValidLwLocationInfoByAnalysisParams & {
  robotType: RobotType
  runId: string
}): LabwareLocationInfo[] {
  if (protocolData == null || labwareDefs == null) {
    return []
  } else if (robotType !== FLEX_ROBOT_TYPE) {
    return []
  } else {
    return getLPCUniqValidLabwareLocationInfo(protocolData, labwareDefs)
  }
}
