import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { getLPCUniqValidLabwareLocationInfo } from './getLPCUniqValidLabwareLocationInfo'
import { isLocationSequenceAnalysisType } from './utils'
import { getLegacyCompatibleLabwareLocationInfo } from '/app/organisms/LabwarePositionCheck/LPCFlows/hooks/useLPCLabwareInfo/getUniqueValidLwLocationInfoByAnalysis/getLegacyCompatibleLabwareLocationInfo'
import { ANALYTICS_LPC_ANALYSIS_KIND } from '/app/redux/analytics'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
  RobotType,
} from '@opentrons/shared-data'
import type { LabwareLocationInfo } from '/app/redux/protocol-runs'
import type { useTrackEvent } from '/app/redux/analytics'

export interface GetUniqueValidLwLocationInfoByAnalysisParams {
  protocolData: CompletedProtocolAnalysis | null
  labwareDefs: LabwareDefinition2[] | null
}

export function getUniqueValidLwLocationInfoByAnalysis({
  labwareDefs,
  protocolData,
  robotType,
  trackEvent,
  runId,
}: GetUniqueValidLwLocationInfoByAnalysisParams & {
  robotType: RobotType
  trackEvent: ReturnType<typeof useTrackEvent>
  runId: string
}): LabwareLocationInfo[] {
  if (protocolData == null || labwareDefs == null) {
    return []
  } else if (robotType !== FLEX_ROBOT_TYPE) {
    return []
  } else {
    const { commands, labware, modules = [] } = protocolData

    // TODO jh(03-14-25): Remove the adapter logic and Mixpanel event once analytics
    //  indicate that users no longer run old analyses.
    const isLocSeqAnalysisType = isLocationSequenceAnalysisType(commands)

    trackEvent({
      name: ANALYTICS_LPC_ANALYSIS_KIND,
      properties: {
        runId,
        kind: isLocSeqAnalysisType ? 'newAnalysis' : 'oldAnalysis',
      },
    })

    return isLocSeqAnalysisType
      ? getLPCUniqValidLabwareLocationInfo(
          commands,
          labware,
          modules,
          labwareDefs
        )
          // Don't return the locationSequence at this point, because LPC doesn't
          // actually care about it, and it's a huge footgun.
          .map(comboWithLoqSeq => {
            const { locationSequence, ...rest } = comboWithLoqSeq
            return rest
          })
      : getLegacyCompatibleLabwareLocationInfo(commands, labware, modules)
  }
}
