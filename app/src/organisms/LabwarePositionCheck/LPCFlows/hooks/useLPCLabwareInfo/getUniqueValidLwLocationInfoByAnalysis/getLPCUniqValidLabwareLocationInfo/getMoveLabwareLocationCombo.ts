import {
  getClosestBeneathAdapterId,
  getClosestBeneathModuleId,
  getClosestBeneathModuleModel,
  getLabwareDefURIFrom,
  getLwModStackupDetails,
  getAddressableAreaNameFrom,
} from './helpers'
import { getLwOffsetLocSeqFrom } from '/app/organisms/LabwarePositionCheck/LPCFlows/hooks/useLPCLabwareInfo/utils'

import type {
  LoadedLabware,
  LoadedModule,
  MoveLabwareRunTimeCommand,
} from '@opentrons/shared-data'
import type { LabwareLocationInfoWithLocSeq } from '.'
import type { AnalysisLwURIsByLwId } from './getAllPossibleLwURIsInRun'

export function getMoveLabwareLocationCombo(
  command: MoveLabwareRunTimeCommand,
  lwURIsByLwId: AnalysisLwURIsByLwId,
  lw: LoadedLabware[],
  modules: LoadedModule[]
): LabwareLocationInfoWithLocSeq | null {
  if (command.result?.eventualDestinationLocationSequence == null) {
    return null
  } else {
    const { labwareId } = command.params
    const { eventualDestinationLocationSequence: loqSeq } = command.result
    const addressableAreaName = getAddressableAreaNameFrom(loqSeq)

    if (addressableAreaName == null) {
      return null
    } else {
      const moduleId = getClosestBeneathModuleId(loqSeq)
      const lwOffsetLocSeq = getLwOffsetLocSeqFrom(loqSeq, lw, modules)
      const definitionUri = getLabwareDefURIFrom(labwareId, lwURIsByLwId)

      return {
        labwareId,
        closestBeneathModuleId: moduleId,
        closestBeneathModuleModel: getClosestBeneathModuleModel(
          moduleId,
          modules
        ),
        definitionUri,
        locationSequence: loqSeq,
        lwOffsetLocSeq,
        addressableAreaName,
        lwModOnlyStackupDetails: getLwModStackupDetails(
          lwOffsetLocSeq,
          loqSeq,
          labwareId,
          definitionUri
        ),
        closestBeneathAdapterId: getClosestBeneathAdapterId(loqSeq),
      }
    }
  }
}
