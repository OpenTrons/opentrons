import {
  getPositionFromSlotId,
  getSlotHasMatingSurfaceUnitVector,
} from '@opentrons/shared-data'

import type { RunData } from '@opentrons/api-client'
import type {
  DeckDefinition,
  LabwareDefinition2,
  LabwareDefinitionsByUri,
} from '@opentrons/shared-data'

export interface RunLabwareInfo {
  x: number
  y: number
  labwareDef: LabwareDefinition2
  labwareId: string
}

export function getRunLabwareRenderInfo(
  runData: RunData,
  labwareDefs: LabwareDefinitionsByUri,
  deckDef: DeckDefinition
): RunLabwareInfo[] {
  if (runData.labware.length > 0) {
    return runData.labware.reduce<RunLabwareInfo[]>((acc, labware) => {
      const location = labware.location
      if (
        (typeof location === 'object' && 'moduleId' in location) ||
        (typeof location === 'object' && 'labwareId' in location) ||
        labware.id === 'fixedTrash'
      ) {
        return acc
      }

      const labwareDef = labwareDefs[labware.definitionUri]
      if (labwareDef == null) {
        return acc
      }

      if (location !== 'offDeck' && location !== 'systemLocation') {
        const slotName =
          'addressableAreaName' in location
            ? location.addressableAreaName
            : location.slotName
        const slotPosition = getPositionFromSlotId(slotName, deckDef)
        const slotHasMatingSurfaceVector = getSlotHasMatingSurfaceUnitVector(
          deckDef,
          slotName
        )

        return slotHasMatingSurfaceVector
          ? [
              ...acc,
              {
                x: slotPosition?.[0] ?? 0,
                y: slotPosition?.[1] ?? 0,
                labwareId: labware.id,
                labwareDef,
              },
            ]
          : acc
      } else {
        return [
          ...acc,
          {
            x: 0,
            y:
              deckDef.cornerOffsetFromOrigin[1] -
              labwareDef.dimensions.yDimension,
            labwareId: labware.id,
            labwareDef,
          },
        ]
      }
    }, [])
  }
  return []
}
