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

// TOME TODO: Make the adapter that checks old analyses, uses the legacy combo util,
//  and then gives us the LabwareLocationCombo[] shape.

export function getUniqueValidLwLocationInfoByAnalysis({
  labwareDefs,
  protocolData,
  robotType,
}: GetUniqueValidLwLocationInfoByAnalysisParams & {
  robotType: RobotType
}): LabwareLocationInfo[] {
  if (protocolData == null || labwareDefs == null) {
    console.error('Cannot get combos if data is undefined.')
    return []
  } else if (robotType !== FLEX_ROBOT_TYPE) {
    return []
  } else {
    const { commands, labware, modules = [] } = protocolData

    return (
      getLPCUniqValidLabwareLocationInfo(
        commands,
        labware,
        modules,
        labwareDefs
      )
        // Don't return the locationSequence, because LPC doesn't actually care about it,
        // and it's a footgun.
        .map(comboWithLoqSeq => {
          const { locationSequence, ...rest } = comboWithLoqSeq
          return rest
        })
    )
  }
}
