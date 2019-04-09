// @flow
import { createSelector } from 'reselect'

import reduce from 'lodash/reduce'

import { getLabware, type WellDefinition } from '@opentrons/shared-data'
import { selectors as stepFormSelectors } from '../../step-forms'
import { selectors as labwareIngredSelectors } from '../../labware-ingred/selectors'
import wellSelectionSelectors from '../../well-selection/selectors'

import type { Selector } from '../../types'
import type {
  Wells,
  ContentsByWell,
  WellContentsByLabware,
} from '../../labware-ingred/types'
import type { SingleLabwareLiquidState } from '../../step-generation'

const _getWellContents = (
  containerType: ?string,
  __ingredientsForContainer: SingleLabwareLiquidState,
  selectedWells: ?Wells,
  highlightedWells: ?Wells
): ContentsByWell | null => {
  // selectedWells and highlightedWells args may both be null,
  // they're only relevant to the selected container.
  if (!containerType) {
    console.warn('_getWellContents called with no containerType, skipping')
    return null
  }

  const containerData = getLabware(containerType)
  if (!containerData) {
    console.warn('No data for container type ' + containerType)
    return null
  }

  const allWells = containerData.wells

  return reduce(
    allWells,
    (
      acc: ContentsByWell,
      well: WellDefinition,
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
          maxVolume: well['total-liquid-volume'] || Infinity,
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
  stepFormSelectors.getLabwareTypesById,
  labwareIngredSelectors.getLiquidsByLabwareId,
  labwareIngredSelectors.getSelectedLabwareId,
  wellSelectionSelectors.getSelectedWells,
  wellSelectionSelectors.getHighlightedWells,
  (
    labwareTypesById,
    liquidsByLabware,
    selectedLabwareId,
    selectedWells,
    highlightedWells
  ) => {
    // TODO: Ian 2019-02-14 weird flow error without explicit Array<string> annotation
    const allLabwareIds: Array<string> = Object.keys(labwareTypesById)

    return allLabwareIds.reduce(
      (acc: WellContentsByLabware, labwareId: string) => {
        const liquidsForLabware = liquidsByLabware[labwareId]
        const isSelectedLabware = selectedLabwareId === labwareId

        const wellContents = _getWellContents(
          labwareTypesById[labwareId],
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
