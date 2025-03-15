import isEqual from 'lodash/isEqual'

import { getLabwareDefURI } from '@opentrons/shared-data'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { LabwareLocationInfoWithLocSeq } from '.'

// Appends the labware location combo if it is "unique" to the existing list of combos
// and "valid".
export function appendUniqValidLocCombo(
  acc: LabwareLocationInfoWithLocSeq[],
  lwDefs: LabwareDefinition2[],
  combo: LabwareLocationInfoWithLocSeq | null
): LabwareLocationInfoWithLocSeq[] {
  if (combo == null) {
    return acc
  } else {
    const isUniqueCombo = !acc.some(accCombo => {
      const { labwareId, ...comboNoLwId } = combo
      const { labwareId: accLwId, ...accComboNoLwId } = accCombo

      return isEqual(accComboNoLwId, comboNoLwId)
    })
    const isValidCombo = isValidLocCombo(lwDefs, combo)

    return isUniqueCombo && isValidCombo ? [...acc, combo] : acc
  }
}

// A combo is "valid" if it is LPC-able.
// We should know that we are dealing strictly with labware at this point!
function isValidLocCombo(
  lwDefs: LabwareDefinition2[],
  combo: LabwareLocationInfoWithLocSeq
): boolean {
  const lwDef = lwDefs.find(
    def => getLabwareDefURI(def) === combo.definitionUri
  )
  const topMostLocSeqComponentKind =
    combo.locationSequence[combo.locationSequence.length - 1].kind
  const isNotAnLPCablComponentKind =
    topMostLocSeqComponentKind === 'notOnDeck' ||
    topMostLocSeqComponentKind === 'inStackerHopper'

  const notLPCable =
    lwDef == null ||
    isNotAnLPCablComponentKind ||
    // We use the lw offset loc seq to get/save offsets. If we can't build one, we can't
    // lpc the labware.
    combo.lwOffsetLocSeq.length === 0

  if (notLPCable) {
    return false
  }
  // TOME TODO: Ask if this is a good assumption in the PR review.
  else if (lwDef.allowedRoles == null) {
    return true
  } else {
    return !(
      lwDef.allowedRoles.includes('lid') ||
      lwDef.allowedRoles.includes('adapter')
    )
  }
}
