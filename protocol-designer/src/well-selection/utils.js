// @flow
import { computeWellAccess } from '@opentrons/shared-data'
import type { LabwareDefinition2 } from '@opentrons/shared-data'

// TODO IMMEDIATELY clearer name for this 2D array
type WellSetByWell = Array<Array<string>>

/** Compute all well sets for a labware type.
 * A well set is array of 8 wells that an 8 channel pipettes can fit into,
 * eg ['A1', 'C1', 'E1', 'G1', 'I1', 'K1', 'M1', 'O1'] is a well set in a 384 plate.
 **/
function _getAllWellSetsForLabware(
  labwareDef: LabwareDefinition2
): WellSetByWell {
  const allWells: Array<string> = Object.keys(labwareDef.wells)
  return allWells.reduce((acc: WellSetByWell, well: string): WellSetByWell => {
    const wellSet = computeWellAccess(labwareDef, well)
    return wellSet === null ? acc : [...acc, wellSet]
  }, [])
}

let cache: {
  [otId: string]: ?{
    labwareDef: LabwareDefinition2,
    wellSetByWell: WellSetByWell,
  },
} = {}
const _getAllWellSetsForLabwareMemoized = (
  labwareDef: LabwareDefinition2
): WellSetByWell => {
  const c = cache[labwareDef.otId]
  // use cached version only if labwareDef is shallowly equal, in case
  // custom labware defs are changed without giving them a new otId
  if (c && c.labwareDef === labwareDef) {
    return c.wellSetByWell
  }
  const wellSetByWell = _getAllWellSetsForLabware(labwareDef)
  cache[labwareDef.otId] = { labwareDef, wellSetByWell }
  return wellSetByWell
}

export function getWellSetForMultichannel(
  labwareDef: LabwareDefinition2,
  well: string
): ?Array<string> {
  /** Given a well for a labware, returns the well set it belongs to (or null)
   * for 8-channel access.
   * Ie: C2 for 96-flat => ['A2', 'B2', 'C2', ... 'H2']
   **/
  const allWellSets = _getAllWellSetsForLabwareMemoized(labwareDef)
  return allWellSets.find((wellSet: Array<string>) => wellSet.includes(well))
}
