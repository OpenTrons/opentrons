import { createSelector } from 'reselect'
import isEmpty from 'lodash/isEmpty'
import mapValues from 'lodash/mapValues'
import min from 'lodash/min'
import pick from 'lodash/pick'
import reduce from 'lodash/reduce'
import omitBy from 'lodash/omitBy'
import { selectors as labwareIngredSelectors } from '/protocol-designer/labware-ingred/selectors'
import { selectors as stepFormSelectors } from '/protocol-designer/step-forms'
import { timelineFrameBeforeActiveItem } from '../timelineFrames'
import { getSelectedWells } from '/protocol-designer/well-selection/selectors'
import {
  getAllWellsForLabware,
  getMaxVolumes,
} from '/protocol-designer/constants'
// TODO Ian 2018-04-19: factor out all these selectors to their own files,
// and make this index.js just imports and exports.
import { getWellContentsAllLabware } from './getWellContentsAllLabware'
import type * as StepGeneration from '@opentrons/step-generation'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  WellContents,
  WellContentsByLabware,
  ContentsByWell,
} from '/protocol-designer/labware-ingred/types'
import type { Selector } from '/protocol-designer/types'

export { getWellContentsAllLabware }
export type { WellContentsByLabware }

function _wellContentsForWell(
  liquidVolState: StepGeneration.LocationLiquidState,
  well: string
): WellContents {
  // TODO IMMEDIATELY Ian 2018-03-23 why is liquidVolState missing sometimes (eg first call with trashId)? Thus the liquidVolState || {}
  const ingredGroupIdsWithContent = Object.keys(liquidVolState || {}).filter(
    groupId => liquidVolState[groupId] && liquidVolState[groupId].volume > 0
  )
  return {
    wellName: well,
    groupIds: ingredGroupIdsWithContent,
    // TODO: BC 2018-09-21 remove in favor of volumeByGroupId
    ingreds: omitBy(
      liquidVolState,
      ingredData => !ingredData || ingredData.volume <= 0
    ),
  }
}

export function _wellContentsForLabware(
  labwareLiquids: StepGeneration.SingleLabwareLiquidState,
  labwareDef: LabwareDefinition2
): ContentsByWell {
  const allWellsForContainer = getAllWellsForLabware(labwareDef)
  return reduce(
    allWellsForContainer,
    (wellAcc, well: string): Record<string, WellContents> => {
      const wellHasContents = labwareLiquids && labwareLiquids[well]
      return {
        ...wellAcc,
        [well]: wellHasContents
          ? _wellContentsForWell(labwareLiquids[well], well)
          : {},
      }
    },
    {}
  )
}
export const getAllWellContentsForActiveItem: Selector<WellContentsByLabware | null> = createSelector(
  stepFormSelectors.getLabwareEntities,
  timelineFrameBeforeActiveItem,
  (labwareEntities, timelineFrame) => {
    if (timelineFrame == null) return null
    const liquidState = timelineFrame.robotState.liquidState.labware
    const wellContentsByLabwareId = mapValues(
      liquidState,
      (
        labwareLiquids: StepGeneration.SingleLabwareLiquidState,
        labwareId: string
      ) => {
        if (labwareEntities[labwareId] == null) return null
        return _wellContentsForLabware(
          labwareLiquids,
          labwareEntities[labwareId].def
        )
      }
    )

    return wellContentsByLabwareId
  }
)
// @ts-expect-error(sa, 2021-6-22): min could return undefined
export const getSelectedWellsMaxVolume: Selector<number> = createSelector(
  getSelectedWells,
  labwareIngredSelectors.getSelectedLabwareId,
  stepFormSelectors.getLabwareEntities,
  (selectedWells, selectedLabwareId, labwareEntities) => {
    const def = selectedLabwareId && labwareEntities[selectedLabwareId].def

    if (!def) {
      console.warn('No container type selected, cannot get max volume')
      return Infinity
    }

    const maxVolumesByWell = getMaxVolumes(def)
    const maxVolumesList = !isEmpty(selectedWells) // when wells are selected, only look at vols of selected wells
      ? Object.values(pick(maxVolumesByWell, Object.keys(selectedWells))) // when no wells selected (eg editing ingred group), look at all volumes.
      : // TODO LATER: look at filled wells, not all wells.
        Object.values(maxVolumesByWell)
    // @ts-expect-error(sa, 2021-6-22): n is already a number, parseInt is meant for strings
    return min(maxVolumesList.map(n => parseInt(n)))
  }
)
interface CommonWellValues {
  ingredientId: string | null | undefined
  volume: number | null | undefined
}

/** Returns the common single ingredient group of selected wells,
 * or null if there is not a single common ingredient group */
export const getSelectedWellsCommonValues: Selector<CommonWellValues> = createSelector(
  getSelectedWells,
  labwareIngredSelectors.getSelectedLabwareId,
  labwareIngredSelectors.getLiquidsByLabwareId,
  (selectedWells, labwareId, allIngreds) => {
    if (!labwareId)
      return {
        ingredientId: null,
        volume: null,
      }
    const ingredsInLabware = allIngreds[labwareId]
    if (!ingredsInLabware || isEmpty(selectedWells))
      return {
        ingredientId: null,
        volume: null,
      }
    const initialWellContents:
      | StepGeneration.LocationLiquidState
      | null
      | undefined = ingredsInLabware[Object.keys(selectedWells)[0]]
    // TODO IMMEDIATELY why arbitrary 0th???
    const initialIngredId: string | null | undefined =
      initialWellContents && Object.keys(initialWellContents)[0]
    const hasCommonIngred = Object.keys(selectedWells).every((well: string) => {
      if (!ingredsInLabware[well]) return null
      const ingreds = Object.keys(ingredsInLabware[well])
      return ingreds.length === 1 && ingreds[0] === initialIngredId
    })

    if (!hasCommonIngred || !initialIngredId || !initialWellContents) {
      return {
        ingredientId: null,
        volume: null,
      }
    } else {
      const initialVolume: number | null | undefined =
        initialWellContents[initialIngredId].volume
      const hasCommonVolume = Object.keys(selectedWells).every(
        (well: string) => {
          if (!ingredsInLabware[well] || !initialIngredId) return null
          return (
            ingredsInLabware[well][initialIngredId].volume === initialVolume
          )
        }
      )
      return {
        ingredientId: initialIngredId,
        volume: hasCommonVolume ? initialVolume : null,
      }
    }
  }
)
export const getSelectedWellsCommonIngredId: Selector<
  string | null | undefined
> = createSelector(
  getSelectedWellsCommonValues,
  commonValues => commonValues.ingredientId || null
)
export const getSelectedWellsCommonVolume: Selector<
  number | null | undefined
> = createSelector(
  getSelectedWellsCommonValues,
  commonValues => commonValues.volume || null
)
