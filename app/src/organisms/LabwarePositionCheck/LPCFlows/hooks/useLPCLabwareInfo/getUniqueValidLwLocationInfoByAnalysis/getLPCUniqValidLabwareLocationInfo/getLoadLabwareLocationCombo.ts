import { getLabwareDefURI } from '@opentrons/shared-data'
import {
  getClosestBeneathAdapterId,
  getClosestBeneathModuleId,
  getClosestBeneathModuleModel,
  getLwModStackupDetails,
  getAddressableAreaNameFrom,
} from './helpers'
import { getLwOffsetLocSeqFromLocSeq } from '/app/local-resources/offsets'

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
    const addressableAreaName = getAddressableAreaNameFrom(locSeq)

    if (addressableAreaName == null) {
      return null
    } else {
      const moduleId = getClosestBeneathModuleId(locSeq)
      const lwOffsetLocSeq = getLwOffsetLocSeqFromLocSeq(locSeq, lw, modules)
      const definitionUri = getLabwareDefURI(definition)

      return {
        labwareId,
        closestBeneathModuleId: moduleId,
        closestBeneathModuleModel: getClosestBeneathModuleModel(
          moduleId,
          modules
        ),
        definitionUri,
        locationSequence: locSeq,
        lwOffsetLocSeq,
        addressableAreaName,
        lwModOnlyStackupDetails: getLwModStackupDetails(
          lwOffsetLocSeq,
          locSeq,
          labwareId,
          definitionUri
        ),
        closestBeneathAdapterId: getClosestBeneathAdapterId(locSeq),
      }
    }
  }
}
