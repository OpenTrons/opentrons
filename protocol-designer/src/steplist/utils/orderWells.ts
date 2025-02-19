import intersection from 'lodash/intersection'
import { orderWells } from '@opentrons/shared-data'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { WellOrderOption } from '/protocol-designer/form-types'
export function getOrderedWells(
  unorderedWells: string[],
  labwareDef: LabwareDefinition2,
  wellOrderFirst: WellOrderOption,
  wellOrderSecond: WellOrderOption
): string[] {
  const allWellsOrdered = orderWells(
    labwareDef.ordering,
    wellOrderFirst,
    wellOrderSecond
  )
  return intersection(allWellsOrdered, unorderedWells)
}
