// @flow
import { createSelector } from 'reselect'
import forEach from 'lodash/forEach'
import mapValues from 'lodash/mapValues'
import max from 'lodash/max'
import reduce from 'lodash/reduce'

import type { Options } from '@opentrons/components'
import type {
  RootState,
  DrillDownLabwareId,
  SelectedContainerId,
  SelectedLiquidGroupState,
} from './reducers'
import type {
  AllIngredGroupFields,
  IngredInputs,
  LiquidGroup,
  OrderedLiquids,
} from './types'
import type { BaseState, Selector } from './../types'

// TODO: Ian 2019-02-15 no RootSlice, use BaseState
type RootSlice = { labwareIngred: RootState }

const rootSelector = (state: RootSlice): RootState => state.labwareIngred

// NOTE: not intended for UI use! Use getLabwareNicknamesById for the string.
const getLabwareNameInfo: Selector<*> = createSelector(
  rootSelector,
  s => s.containers
)

const getLiquidGroupsById = (state: RootSlice) =>
  rootSelector(state).ingredients
const getLiquidsByLabwareId = (state: RootSlice) =>
  rootSelector(state).ingredLocations

const getNextLiquidGroupId: Selector<string> = createSelector(
  getLiquidGroupsById,
  ingredGroups =>
    (max(Object.keys(ingredGroups).map(id => parseInt(id))) + 1 || 0).toString()
)

const getLiquidNamesById: Selector<{
  [ingredId: string]: string,
}> = createSelector(
  getLiquidGroupsById,
  ingredGroups => mapValues(ingredGroups, (ingred: LiquidGroup) => ingred.name)
)

const getLiquidSelectionOptions: Selector<Options> = createSelector(
  getLiquidGroupsById,
  liquidGroupsById => {
    return Object.keys(liquidGroupsById).map(id => ({
      // NOTE: if these fallbacks are used, it's a bug
      name: liquidGroupsById[id]
        ? liquidGroupsById[id].name || `(Unnamed Liquid: ${String(id)})`
        : 'Missing Liquid',
      value: id,
    }))
  }
)

// false or selected slot to add labware to, eg 'A2'
const selectedAddLabwareSlot = (state: BaseState) =>
  rootSelector(state).modeLabwareSelection

const getSavedLabware = (state: BaseState) => rootSelector(state).savedLabware

const getSelectedLabwareId: Selector<SelectedContainerId> = createSelector(
  rootSelector,
  rootState => rootState.selectedContainerId
)

const getSelectedLiquidGroupState: Selector<SelectedLiquidGroupState> = createSelector(
  rootSelector,
  rootState => rootState.selectedLiquidGroup
)

const getDrillDownLabwareId: Selector<DrillDownLabwareId> = createSelector(
  rootSelector,
  rootState => rootState.drillDownLabwareId
)

// TODO Ian 2018-07-06 consolidate into types.js
type IngredGroupFields = {
  [ingredGroupId: string]: {
    groupId: string,
    ...$Exact<IngredInputs>,
  },
}
const allIngredientGroupFields: Selector<AllIngredGroupFields> = createSelector(
  getLiquidGroupsById,
  ingreds =>
    reduce(
      ingreds,
      (
        acc: IngredGroupFields,
        ingredGroup: IngredGroupFields,
        ingredGroupId: string
      ) => ({
        ...acc,
        [ingredGroupId]: ingredGroup,
      }),
      {}
    )
)

const allIngredientNamesIds: BaseState => OrderedLiquids = createSelector(
  getLiquidGroupsById,
  ingreds =>
    Object.keys(ingreds).map(ingredId => ({
      ingredientId: ingredId,
      name: ingreds[ingredId].name,
    }))
)

const getLabwareSelectionMode: Selector<boolean> = createSelector(
  rootSelector,
  rootState => {
    return rootState.modeLabwareSelection !== false
  }
)

const getLiquidGroupsOnDeck: Selector<Array<string>> = createSelector(
  getLiquidsByLabwareId,
  ingredLocationsByLabware => {
    let liquidGroups: Set<string> = new Set()
    forEach(
      ingredLocationsByLabware,
      (byWell: $Values<typeof ingredLocationsByLabware>) =>
        forEach(byWell, (groupContents: $Values<typeof byWell>) => {
          forEach(
            groupContents,
            (
              contents: $Values<typeof groupContents>,
              groupId: $Keys<typeof groupContents>
            ) => {
              if (contents.volume > 0) {
                liquidGroups.add(groupId)
              }
            }
          )
        })
    )
    return [...liquidGroups]
  }
)

const getDeckHasLiquid: Selector<boolean> = createSelector(
  getLiquidGroupsOnDeck,
  liquidGroups => liquidGroups.length > 0
)

// TODO: prune selectors
export const selectors = {
  rootSelector,

  getLiquidGroupsById,
  getLiquidsByLabwareId,
  getLiquidNamesById,
  getLabwareSelectionMode,
  getLabwareNameInfo,
  getLiquidSelectionOptions,
  getLiquidGroupsOnDeck,
  getNextLiquidGroupId,
  getSavedLabware,
  getSelectedLabwareId,
  getSelectedLiquidGroupState,
  getDrillDownLabwareId,

  allIngredientGroupFields,
  allIngredientNamesIds,
  selectedAddLabwareSlot,
  getDeckHasLiquid,
}
