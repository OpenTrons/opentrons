import { getLabwareDefURI } from '@opentrons/shared-data'
import {
  getClosestBeneathAdapterId,
  getClosestBeneathModuleId,
  getClosestBeneathModuleModel,
  getLwModOnlyLocSeqWithIds,
  getSlotNameFrom,
} from './helpers'
import { getLwOffsetLocSeqFrom } from '/app/organisms/LabwarePositionCheck/LPCFlows/hooks/useLPCLabwareInfo/utils'

import type {
  LoadLabwareRunTimeCommand,
  LoadedLabware,
  LoadedModule,
} from '@opentrons/shared-data'
import type { LabwareLocationInfoWithLocSeq } from '.'

export function getLoadLabwareLocationCombo(
  command: LoadLabwareRunTimeCommand,
  lw: LoadedLabware[],
  modules: LoadedModule[]
): LabwareLocationInfoWithLocSeq | null {
  if (command.result?.locationSequence == null) {
    return null
  } else {
    const { locationSequence: locSeq, labwareId, definition } = command.result
    const slotName = getSlotNameFrom(locSeq)

    if (slotName == null) {
      return null
    } else {
      const moduleId = getClosestBeneathModuleId(locSeq)
      const lwOffsetLocSeq = getLwOffsetLocSeqFrom(locSeq, lw, modules)

      return {
        labwareId,
        closestBeneathModuleId: moduleId,
        closestBeneathModuleModel: getClosestBeneathModuleModel(
          moduleId,
          modules
        ),
        definitionUri: getLabwareDefURI(definition),
        locationSequence: locSeq,
        lwOffsetLocSeq,
        slotName,
        lwModOnlyStackupDetails: getLwModOnlyLocSeqWithIds(
          lwOffsetLocSeq,
          locSeq
        ),
        closestBeneathAdapterId: getClosestBeneathAdapterId(locSeq),
      }
    }
  }
}
