import { isEqual } from 'lodash'

import { getLabwareDefURI } from '@opentrons/shared-data'

import { getLegacyLabwareLocationCombos } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLegacyLabwareLocationCombos'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { LegacyLabwareLocationCombo } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLegacyLabwareLocationCombos'

export interface GetUniqueLocationComboInfoParams {
  protocolData: CompletedProtocolAnalysis | null
  labwareDefs: LabwareDefinition2[] | null
}

export function getUniqueLabwareLocationComboInfo({
  labwareDefs,
  protocolData,
}: GetUniqueLocationComboInfoParams): LegacyLabwareLocationCombo[] {
  if (protocolData == null || labwareDefs == null) {
    return []
  }

  const { commands, labware, modules = [] } = protocolData
  const labwareLocationCombos = getLegacyLabwareLocationCombos(
    commands,
    labware,
    modules
  )

  // Filter out duplicate labware and labware that is not LPC-able.
  return labwareLocationCombos.reduce<LegacyLabwareLocationCombo[]>(
    (acc, labwareLocationCombo) => {
      const labwareDef = labwareDefs.find(
        def => getLabwareDefURI(def) === labwareLocationCombo.definitionUri
      )
      if (
        (labwareDef?.allowedRoles ?? []).includes('adapter') ||
        (labwareDef?.allowedRoles ?? []).includes('lid') ||
        (labwareDef?.allowedRoles ?? []).includes('system')
      ) {
        return acc
      }
      // remove duplicate definitionUri in same location
      const comboAlreadyExists = acc.some(
        accLocationCombo =>
          labwareLocationCombo.definitionUri ===
            accLocationCombo.definitionUri &&
          isEqual(labwareLocationCombo.location, accLocationCombo.location)
      )
      return comboAlreadyExists ? acc : [...acc, labwareLocationCombo]
    },
    []
  )
}
