import {
  getClosestBeneathAdapterId,
  getClosestBeneathModuleId,
  getClosestBeneathModuleModel,
  getLabwareDefURIFrom,
  getLwModOnlyLocSeqWithIds,
  getLwOffsetLocSeqFrom,
  getSlotNameFrom,
} from './helpers'

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
  // TOME TODO: Confirm in PR that this is a fine check AND we care about the eventual rather
  //  than the immediate.
  if (command.result?.eventualDestinationLocationSequence == null) {
    return null
  } else {
    const { labwareId } = command.params
    const { eventualDestinationLocationSequence: loqSeq } = command.result
    const slotName = getSlotNameFrom(loqSeq)

    if (slotName == null) {
      return null
    } else {
      const moduleId = getClosestBeneathModuleId(loqSeq)
      const lwOffsetLocSeq = getLwOffsetLocSeqFrom(loqSeq, lw, modules)

      return {
        labwareId,
        closestBeneathModuleId: moduleId,
        closestBeneathModuleModel: getClosestBeneathModuleModel(
          moduleId,
          modules
        ),
        definitionUri: getLabwareDefURIFrom(labwareId, lwURIsByLwId),
        locationSequence: loqSeq,
        lwOffsetLocSeq,
        slotName,
        lwModOnlyStackupDetails: getLwModOnlyLocSeqWithIds(
          lwOffsetLocSeq,
          loqSeq
        ),
        closestBeneathAdapterId: getClosestBeneathAdapterId(loqSeq),
      }
    }
  }
}
