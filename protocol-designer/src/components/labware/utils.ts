// @flow
import reduce from 'lodash/reduce'
import { AIR } from '@opentrons/step-generation'
import { swatchColors, MIXED_WELL_COLOR } from '../swatchColors'
import type { WellFill } from '@opentrons/components'
import type { ContentsByWell, WellContents } from '../../labware-ingred/types'

const ingredIdsToColor = (groupIds: Array<string>): ?string => {
  const filteredIngredIds = groupIds.filter(id => id !== AIR)
  if (filteredIngredIds.length === 0) return null
  if (filteredIngredIds.length === 1) {
    return swatchColors(filteredIngredIds[0])
  }
  return MIXED_WELL_COLOR
}

export const wellFillFromWellContents = (
  wellContents: ContentsByWell
): WellFill =>
  reduce(
    wellContents,
    (acc, wellContents: WellContents, wellName: string) => {
      const wellFill = ingredIdsToColor(wellContents.groupIds)
      return wellFill ? { ...acc, [wellName]: wellFill } : acc
    },
    {}
  )
