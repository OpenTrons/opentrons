import { createSelector } from 'reselect'
import reduce from 'lodash/reduce'
import { selectors as stepFormSelectors } from '/protocol-designer/step-forms'
import { selectors as labwareIngredSelectors } from '/protocol-designer/labware-ingred/selectors'
import {
  getSelectedWells,
  getHighlightedWells,
} from '/protocol-designer/well-selection/selectors'
import type { WellGroup } from '@opentrons/components'
import type { LabwareDefinition2, LabwareWell } from '@opentrons/shared-data'
import type { SingleLabwareLiquidState } from '@opentrons/step-generation'
import type { Selector } from '/protocol-designer/types'
import type {
  ContentsByWell,
  WellContentsByLabware,
} from '/protocol-designer/labware-ingred/types'

const _getWellContents = (
  labwareDef: LabwareDefinition2,
  __ingredientsForContainer: SingleLabwareLiquidState,
  selectedWells: WellGroup | null | undefined,
  highlightedWells: WellGroup | null | undefined
): ContentsByWell => {
  // selectedWells and highlightedWells args may both be null,
  // they're only relevant to the selected container.
  const allWells = labwareDef.wells
  return reduce<LabwareDefinition2['wells'], ContentsByWell>(
    allWells,
    (
      acc: ContentsByWell,
      well: LabwareWell,
      wellName: string
    ): ContentsByWell => {
      const groupIds: string[] =
        __ingredientsForContainer && __ingredientsForContainer[wellName]
          ? Object.keys(__ingredientsForContainer[wellName])
          : []
      return {
        ...acc,
        [wellName]: {
          highlighted: highlightedWells ? wellName in highlightedWells : false,
          selected: selectedWells ? wellName in selectedWells : false,
          maxVolume: well.totalLiquidVolume,
          groupIds,
          ingreds: __ingredientsForContainer?.[wellName] || {},
        },
      }
    },
    {}
  )
}

export const getWellContentsAllLabware: Selector<WellContentsByLabware> = createSelector(
  stepFormSelectors.getLabwareEntities,
  labwareIngredSelectors.getLiquidsByLabwareId,
  labwareIngredSelectors.getSelectedLabwareId,
  getSelectedWells,
  getHighlightedWells,
  (
    labwareEntities,
    liquidsByLabware,
    selectedLabwareId,
    selectedWells,
    highlightedWells
  ) => {
    const allLabwareIds: string[] = Object.keys(labwareEntities)
    return allLabwareIds.reduce(
      (
        acc: WellContentsByLabware,
        labwareId: string
      ): WellContentsByLabware => {
        const liquidsForLabware = liquidsByLabware[labwareId]
        const isSelectedLabware = selectedLabwareId === labwareId

        const wellContents = _getWellContents(
          labwareEntities[labwareId].def,
          liquidsForLabware, // Only give _getWellContents the selection data if it's a selected container
          isSelectedLabware ? selectedWells : null,
          isSelectedLabware ? highlightedWells : null
        )

        // Skip labware ids with no liquids
        return wellContents ? { ...acc, [labwareId]: wellContents } : acc
      },
      {}
    )
  }
)
