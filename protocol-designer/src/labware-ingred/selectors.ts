/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/restrict-plus-operands */
import { createSelector, Selector } from 'reselect'
import forEach from 'lodash/forEach'
import mapValues from 'lodash/mapValues'
import max from 'lodash/max'
import reduce from 'lodash/reduce'
import { Options } from '@opentrons/components'
import { LabwareLiquidState } from '@opentrons/step-generation'
import {
  RootState,
  ContainersState,
  DrillDownLabwareId,
  IngredientsState,
  SelectedContainerId,
  SelectedLiquidGroupState,
} from './reducers'
import {
  AllIngredGroupFields,
  IngredInputs,
  LiquidGroup,
  OrderedLiquids,
} from './types'
import { BaseState, MemoizedSelector, DeckSlot } from './../types'
// TODO: Ian 2019-02-15 no RootSlice, use BaseState
interface RootSlice {
  labwareIngred: RootState
}

const rootSelector = (state: RootSlice): RootState => state.labwareIngred

// NOTE: not intended for UI use! Use getLabwareNicknamesById for the string.
const getLabwareNameInfo: Selector<RootSlice, ContainersState> = createSelector(
  rootSelector,
  s => s.containers
)

const getLiquidGroupsById = (state: RootSlice): IngredientsState =>
  rootSelector(state).ingredients

const getLiquidsByLabwareId = (state: RootSlice): LabwareLiquidState =>
  rootSelector(state).ingredLocations

const getNextLiquidGroupId: Selector<RootSlice, string> = createSelector(
  getLiquidGroupsById,
  ingredGroups =>
    // @ts-expect-error(sa, 2021-6-15): this could return undefined
    (max(Object.keys(ingredGroups).map(id => parseInt(id))) + 1 || 0).toString()
)
const getLiquidNamesById: Selector<
  RootSlice,
  Record<string, string>
> = createSelector(getLiquidGroupsById, ingredGroups =>
  mapValues(ingredGroups, (ingred: LiquidGroup) => ingred.name)
)
const getLiquidSelectionOptions: Selector<RootSlice, Options> = createSelector(
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
const selectedAddLabwareSlot = (state: BaseState): DeckSlot | false =>
  rootSelector(state).modeLabwareSelection

// TODO(mc, 2020-06-04): move SavedLabwareState to common location and import here
const getSavedLabware = (state: BaseState): Record<string, boolean> =>
  rootSelector(state).savedLabware

const getSelectedLabwareId: Selector<
  RootSlice,
  SelectedContainerId
> = createSelector(rootSelector, rootState => rootState.selectedContainerId)
const getSelectedLiquidGroupState: Selector<
  RootSlice,
  SelectedLiquidGroupState
> = createSelector(rootSelector, rootState => rootState.selectedLiquidGroup)
const getDrillDownLabwareId: Selector<
  RootSlice,
  DrillDownLabwareId
> = createSelector(rootSelector, rootState => rootState.drillDownLabwareId)
const allIngredientGroupFields: Selector<
  RootSlice,
  AllIngredGroupFields
> = createSelector(getLiquidGroupsById, ingreds =>
  reduce<IngredientsState, AllIngredGroupFields>(
    ingreds,
    (acc, ingredGroup: IngredInputs, ingredGroupId): AllIngredGroupFields => ({
      ...acc,
      [ingredGroupId]: ingredGroup,
    }),
    {}
  )
)
const allIngredientNamesIds: Selector<
  RootSlice,
  OrderedLiquids
> = createSelector(getLiquidGroupsById, ingreds =>
  Object.keys(ingreds).map(ingredId => ({
    ingredientId: ingredId,
    name: ingreds[ingredId].name,
  }))
)
const getLabwareSelectionMode: Selector<RootSlice, boolean> = createSelector(
  rootSelector,
  rootState => {
    return rootState.modeLabwareSelection !== false
  }
)
const getLiquidGroupsOnDeck: Selector<RootSlice, string[]> = createSelector(
  getLiquidsByLabwareId,
  ingredLocationsByLabware => {
    const liquidGroups: Set<string> = new Set()
    forEach(
      ingredLocationsByLabware,
      (
        byWell: typeof ingredLocationsByLabware[keyof typeof ingredLocationsByLabware]
      ) =>
        forEach(byWell, (groupContents: typeof byWell[keyof typeof byWell]) => {
          forEach(
            groupContents,
            (
              contents: typeof groupContents[keyof typeof groupContents],
              groupId: keyof typeof groupContents
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
const getDeckHasLiquid: Selector<RootSlice, boolean> = createSelector(
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
