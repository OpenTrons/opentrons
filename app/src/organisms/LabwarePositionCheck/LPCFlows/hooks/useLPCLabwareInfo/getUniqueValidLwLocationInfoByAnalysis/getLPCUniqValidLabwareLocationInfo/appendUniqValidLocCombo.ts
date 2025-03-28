import isEqual from 'lodash/isEqual'

import {
  FLEX_STAGING_ADDRESSABLE_AREAS,
  getLabwareDefURI,
} from '@opentrons/shared-data'

import type {
  LabwareDefinition2,
  LabwareLocationSequence,
} from '@opentrons/shared-data'
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
      const { lwOffsetLocSeq: comboOffsetLs, definitionUri: comboUri } = combo
      const { lwOffsetLocSeq: accOffsetLs, definitionUri: accUri } = accCombo

      return isEqual(comboOffsetLs, accOffsetLs) && isEqual(comboUri, accUri)
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
  const isInStagingAreaSlot = getIsInStagingAreaSlot(combo.locationSequence)

  const isNotAnLPCablComponentKind =
    topMostLocSeqComponentKind === 'notOnDeck' ||
    topMostLocSeqComponentKind === 'inStackerHopper' ||
    isInStagingAreaSlot

  const notLPCable =
    lwDef == null ||
    isNotAnLPCablComponentKind ||
    // We use the lw offset loc seq to get/save offsets. If we can't build one, we can't
    // lpc the labware.
    combo.lwOffsetLocSeq.length === 0

  if (notLPCable) {
    return false
  } else if (lwDef.allowedRoles == null) {
    return true
  } else {
    return !(
      lwDef.allowedRoles.includes('lid') ||
      lwDef.allowedRoles.includes('adapter') ||
      lwDef.allowedRoles.includes('system')
    )
  }
}

function getIsInStagingAreaSlot(ls: LabwareLocationSequence): boolean {
  const aaLocComponent = ls.find(
    component => component.kind === 'onAddressableArea'
  )

  if (aaLocComponent != null) {
    return (
      aaLocComponent.kind === 'onAddressableArea' &&
      FLEX_STAGING_ADDRESSABLE_AREAS.includes(
        aaLocComponent.addressableAreaName
      )
    )
  } else {
    return false
  }
}
