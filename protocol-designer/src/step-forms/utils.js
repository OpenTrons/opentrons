// @flow
import assert from 'assert'
import reduce from 'lodash/reduce'
import { getPipetteNameSpecs } from '@opentrons/shared-data'
import type { DeckSlot } from '@opentrons/components'
import type { PipetteInvariantState } from './reducers'
import type { PipetteEntity, PipetteEntities } from './types'

// for backwards compatibility, strip version suffix (_v1, _v1.3 etc)
// from model string, if it exists
// TODO Ian 2018-12-13: Remove this and all uses next breaking change in PD files
export const pipetteModelToName = (model: string) =>
  model.replace(/_v\d(\.|\d+)*$/, '')

export function getIdsInRange<T: string | number>(
  orderedIds: Array<T>,
  startId: T,
  endId: T
): Array<T> {
  const startIdx = orderedIds.findIndex(id => id === startId)
  const endIdx = orderedIds.findIndex(id => id === endId)
  assert(
    startIdx !== -1,
    `start step "${String(startId)}" does not exist in orderedStepIds`
  )
  assert(
    endIdx !== -1,
    `end step "${String(endId)}" does not exist in orderedStepIds`
  )
  assert(
    endIdx >= startIdx,
    `expected end index to be greater than or equal to start index, got "${startIdx}", "${endIdx}"`
  )
  return orderedIds.slice(startIdx, endIdx + 1)
}

export function getLabwareIdInSlot(
  labwareIdToSlot: { [labwareId: string]: DeckSlot },
  slot: DeckSlot
): ?string {
  const labwareIdsForSourceSlot = Object.entries(labwareIdToSlot)
    .filter(([id, labwareSlot]) => labwareSlot === slot)
    .map(([id, labwareSlot]) => id)
  assert(
    labwareIdsForSourceSlot.length < 2,
    `multiple labware in slot ${slot}, expected none or one`
  )
  return labwareIdsForSourceSlot[0]
}

// helper to add the 'spec' key to pipette entities safely
export function addSpecsToPipetteInvariantProps(
  pipetteInvariantProperties: PipetteInvariantState
): PipetteEntities {
  return reduce(
    pipetteInvariantProperties,
    (
      acc: PipetteEntities,
      pipette: PipetteEntity,
      id: string
    ): PipetteEntities => {
      const spec = getPipetteNameSpecs(pipette.name)
      assert(
        spec,
        `no pipette spec for pipette id "${id}", name "${pipette.name}"`
      )
      return spec ? { ...acc, [id]: { ...pipette, spec } } : acc
    },
    {}
  )
}
