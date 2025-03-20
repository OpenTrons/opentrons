import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { getLPCUniqValidLabwareLocationInfo } from './getLPCUniqValidLabwareLocationInfo'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  RobotType,
} from '@opentrons/shared-data'
import type { LabwareLocationInfo } from '/app/redux/protocol-runs'
import { getActivePipetteId } from '/app/organisms/LabwarePositionCheck/LPCFlows/hooks/useUpdateLPCStore/utils'

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
}): LabwareLocationInfo[] {
  // If there's no pipette, there's nothing to LPC.
  const activePipetteId = getActivePipetteId(protocolData?.pipettes ?? [])

  if (protocolData == null || labwareDefs == null || activePipetteId == null) {
    return []
  } else if (robotType !== FLEX_ROBOT_TYPE) {
    return []
  } else {
    return getLPCUniqValidLabwareLocationInfo(protocolData, labwareDefs)
  }
}
