import uniqBy from 'lodash/uniqBy'

import { getLegacyLabwareLocationCombos } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLegacyLabwareLocationCombos'
import { getLabwareLocationInfoFrom } from './getLabwareLocationInfoFrom'

import type {
  RunTimeCommand,
  LoadedLabware,
  LoadedModule,
} from '@opentrons/shared-data'
import type { LabwareLocationInfo } from '/app/redux/protocol-runs'
import type { LegacyLabwareLocationCombo } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLegacyLabwareLocationCombos'

export function getLegacyCompatibleLabwareLocationInfo(
  commands: RunTimeCommand[],
  labware: LoadedLabware[],
  modules: LoadedModule[]
): LabwareLocationInfo[] {
  const legacyLocationCombos = getLegacyLabwareLocationCombos(
    commands,
    labware,
    modules
  )
  const filteredLegacyCombos = filterDuplicateCombos(legacyLocationCombos)

  return getLabwareLocationInfoFrom(filteredLegacyCombos, labware)
}

// Filters out duplicate legacy combos. Duplicates are identical except for their labwareId.
function filterDuplicateCombos(
  legacyLocationCombos: LegacyLabwareLocationCombo[]
): LegacyLabwareLocationCombo[] {
  const getUniqueKey = (combo: LegacyLabwareLocationCombo): string => {
    const { labwareId, ...rest } = combo

    // Ensures consistent ordering of properties for reliable comparison
    const locationKey = {
      slotName: rest.location.slotName,
      moduleModel: rest.location.moduleModel,
      definitionUri: rest.location.definitionUri,
    }

    return JSON.stringify({
      location: locationKey,
      definitionUri: rest.definitionUri,
      moduleId: rest.moduleId,
      adapterId: rest.adapterId,
    })
  }

  return uniqBy(legacyLocationCombos, getUniqueKey)
}
