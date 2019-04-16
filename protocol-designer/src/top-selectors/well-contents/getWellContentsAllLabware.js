// @flow
import { createSelector } from 'reselect'

import reduce from 'lodash/reduce'

import { selectors as stepFormSelectors } from '../../step-forms'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import wellSelectionSelectors from '../../well-selection/selectors'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { Selector } from '../../types'
import type {
  Wells,
  ContentsByWell,
  WellContentsByLabware,
} from '../../labware-ingred/types'
import type { SingleLabwareLiquidState } from '../../step-generation'

const _getWellContents = (
  labwareDef: LabwareDefinition2,
  __ingredientsForContainer: SingleLabwareLiquidState,
  selectedWells: ?Wells,
  highlightedWells: ?Wells
): ContentsByWell | null => {
  // selectedWells and highlightedWells args may both be null,
  // they're only relevant to the selected container.
  const allWells = labwareDef.wells

  return reduce(
    allWells,
    (
      acc: ContentsByWell,
      well: $PropertyType<LabwareDefinition2, 'wells'>,
      wellName: string
    ): ContentsByWell => {
      const groupIds =
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
          ingreds:
            __ingredientsForContainer && __ingredientsForContainer[wellName],
        },
      }
    },
    {}
  )
}

const getWellContentsAllLabware: Selector<WellContentsByLabware> = createSelector(
  stepFormSelectors.getLabwareEntities,
  labwareIngredSelectors.getLiquidsByLabwareId,
  labwareIngredSelectors.getSelectedLabwareId,
  wellSelectionSelectors.getSelectedWells,
  wellSelectionSelectors.getHighlightedWells,
  (
    labwareEntities,
    liquidsByLabware,
    selectedLabwareId,
    selectedWells,
    highlightedWells
  ) => {
    // TODO: Ian 2019-02-14 weird flow error without explicit Array<string> annotation
    const allLabwareIds: Array<string> = Object.keys(labwareEntities)

    return allLabwareIds.reduce(
      (acc: WellContentsByLabware, labwareId: string) => {
        const liquidsForLabware = liquidsByLabware[labwareId]
        const isSelectedLabware = selectedLabwareId === labwareId

        const wellContents = _getWellContents(
          labwareEntities[labwareId].def,
          liquidsForLabware,
          // Only give _getWellContents the selection data if it's a selected container
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

export default getWellContentsAllLabware
