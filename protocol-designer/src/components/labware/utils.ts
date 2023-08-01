import reduce from 'lodash/reduce'
import { AIR } from '@opentrons/step-generation'
import { WellFill } from '@opentrons/components'
import { swatchColors, MIXED_WELL_COLOR } from '../swatchColors'
import { ContentsByWell, WellContents } from '../../labware-ingred/types'
import { LabwareOnDeck } from '../../step-forms'

const ingredIdsToColor = (
  groupIds: string[],
  displayColors: string[]
): string | null | undefined => {
  const filteredIngredIds = groupIds.filter(id => id !== AIR)
  if (filteredIngredIds.length === 0) return null

  if (filteredIngredIds.length === 1) {
    return (
      displayColors[Number(filteredIngredIds[0])] ??
      swatchColors(filteredIngredIds[0])
    )
  }

  return MIXED_WELL_COLOR
}

export const wellFillFromWellContents = (
  wellContents: ContentsByWell,
  displayColors: string[]
): WellFill =>
  reduce(
    wellContents,
    (acc: WellFill, wellContents: WellContents, wellName: string) => {
      const wellFill = ingredIdsToColor(wellContents.groupIds, displayColors)
      return wellFill ? { ...acc, [wellName]: wellFill } : acc
    },
    {}
  )

export const getIsAdapter = (labwareOnDeck: LabwareOnDeck): boolean =>
  labwareOnDeck.def.metadata.displayCategory === 'adapter'
