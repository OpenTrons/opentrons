// @flow
import {createSelector} from 'reselect'
import last from 'lodash/last'
import reduce from 'lodash/reduce'
import mapValues from 'lodash/mapValues'
import isEmpty from 'lodash/isEmpty'
import each from 'lodash/each'

import {selectors as labwareIngredSelectors} from '../labware-ingred/reducers'
import {selectors as pipetteSelectors} from '../pipettes'
import {
  getFormErrors,
  stepFormToArgs,
} from './formLevel'
import {
  hydrateField,
  getFieldErrors,
} from './fieldLevel'
import {initialSelectedItemState} from './reducers'
import type {RootState, OrderedStepsState, SelectableItem} from './reducers'
import type {BaseState, Selector} from '../types'

import type {
  FormSectionState,
  SubstepIdentifier,
  TerminalItemId,
  StepFormAndFieldErrors,
  StepArgsAndErrors,
  StepFormContextualState,
} from './types'

import type {
  FormData,
  StepIdType,
} from '../form-types'

const NO_SAVED_FORM_ERROR = 'NO_SAVED_FORM_ERROR'

const rootSelector = (state: BaseState): RootState => state.steplist

// ======= Selectors ===============================================

const getStepFormContextualState: Selector<StepFormContextualState> = createSelector(
  labwareIngredSelectors.rootSelector,
  pipetteSelectors.rootSelector,
  (labwareIngred, pipettes) => ({
    labwareIngred,
    pipettes,
  })
)

/** fallbacks for selectedItem reducer, when null */
const getNonNullSelectedItem: Selector<SelectableItem> = createSelector(
  rootSelector,
  (state: RootState) => {
    if (state.selectedItem != null) return state.selectedItem
    if (state.orderedSteps.length > 0) return {isStep: true, id: last(state.orderedSteps)}
    return initialSelectedItemState
  }
)

const getSelectedStepId: Selector<?StepIdType> = createSelector(
  getNonNullSelectedItem,
  (item) => item.isStep ? item.id : null
)

const getSelectedTerminalItemId: Selector<?TerminalItemId> = createSelector(
  getNonNullSelectedItem,
  (item) => !item.isStep ? item.id : null
)

const getHoveredItem: Selector<?SelectableItem> = createSelector(
  rootSelector,
  (state: RootState) => state.hoveredItem
)

const getHoveredStepId: Selector<?StepIdType> = createSelector(
  getHoveredItem,
  (item) => (item && item.isStep) ? item.id : null
)

const getHoveredTerminalItemId: Selector<?TerminalItemId> = createSelector(
  getHoveredItem,
  (item) => (item && !item.isStep) ? item.id : null
)

const getHoveredSubstep: Selector<SubstepIdentifier> = createSelector(
  rootSelector,
  (state: RootState) => state.hoveredSubstep
)

// Hovered or selected item. Hovered has priority.
// Uses fallback of getNonNullSelectedItem if not hovered or selected
const getActiveItem: Selector<SelectableItem> = createSelector(
  getNonNullSelectedItem,
  getHoveredItem,
  (selected, hovered) => hovered != null
    ? hovered
    : selected
)

const getSteps = createSelector(
  rootSelector,
  (state: RootState) => state.steps
)

const getCollapsedSteps = createSelector(
  rootSelector,
  (state: RootState) => state.collapsedSteps
)

const getOrderedSteps: Selector<OrderedStepsState> = createSelector(
  rootSelector,
  (state: RootState) => state.orderedSteps
)

/** This is just a simple selector, but has some debugging logic. TODO Ian 2018-03-20: use assert here */
const getSavedForms: Selector<{[StepIdType]: FormData}> = createSelector(
  getSteps,
  getOrderedSteps,
  (state: BaseState) => rootSelector(state).savedStepForms,
  (steps, orderedSteps, savedStepForms) => {
    orderedSteps.forEach(stepId => {
      if (!steps[stepId]) {
        console.error(`Encountered an undefined step: ${stepId}`)
      }
    })

    return savedStepForms
  }
)

const getHydratedSavedForms: Selector<{[StepIdType]: FormData}> = createSelector(
  getSavedForms,
  getStepFormContextualState,
  (savedForms, contextualState) => (
    mapValues(savedForms, (savedForm) => (
      mapValues(savedForm, (value, name) => (
        hydrateField(contextualState, name, value)
      ))
    ))
  )
)

// TODO type with hydrated form type
const getAllErrorsFromHydratedForm = (hydratedForm: FormData): StepFormAndFieldErrors => {
  let errors: StepFormAndFieldErrors = {}

  each(hydratedForm, (value, fieldName) => {
    const fieldErrors = getFieldErrors(fieldName, value)
    if (fieldErrors && fieldErrors.length > 0) {
      errors = {
        ...errors,
        field: {
          ...errors.field,
          [fieldName]: fieldErrors,
        },
      }
    }
  })
  const formErrors = getFormErrors(hydratedForm.stepType, hydratedForm)
  if (formErrors && formErrors.length > 0) {
    errors = {...errors, form: formErrors}
  }

  return errors
}

// TODO Brian 2018-10-29 separate out getErrors and getStepArgs
const getArgsAndErrorsByStepId: Selector<{[StepIdType]: StepArgsAndErrors}> = createSelector(
  getSteps,
  getHydratedSavedForms,
  getOrderedSteps,
  (steps, savedStepForms, orderedSteps) => {
    return reduce(orderedSteps, (acc, stepId) => {
      let nextStepData
      if (steps[stepId] && savedStepForms[stepId]) {
        const savedForm = savedStepForms[stepId]

        const errors = getAllErrorsFromHydratedForm(savedForm)

        nextStepData = isEmpty(errors)
          ? {stepArgs: stepFormToArgs(savedForm)}
          : {errors, stepArgs: null}
      } else {
        // NOTE: usually, stepFormData is undefined here b/c there's no saved step form for it:
        nextStepData = {
          errors: {form: [{title: NO_SAVED_FORM_ERROR}]},
          stepArgs: null,
        }
      } // TODO Ian 2018-03-20 revisit "no saved form for step"
      return {
        ...acc,
        [stepId]: nextStepData,
      }
    }, {})
  }
)

/** Array of labware (labwareId's) involved in hovered Step, or [] */
const getHoveredStepLabware: Selector<Array<string>> = createSelector(
  getArgsAndErrorsByStepId,
  getHoveredStepId,
  (allStepArgsAndErrors, hoveredStep) => {
    const blank = []
    if (!hoveredStep || !allStepArgsAndErrors[hoveredStep]) {
      return blank
    }

    const stepForm = allStepArgsAndErrors[hoveredStep].stepArgs

    if (!stepForm) {
      return blank
    }

    if (
      stepForm.stepType === 'consolidate' ||
      stepForm.stepType === 'distribute' ||
      stepForm.stepType === 'transfer'
    ) {
      // source and dest labware
      const src = stepForm.sourceLabware
      const dest = stepForm.destLabware

      return [src, dest]
    }

    if (stepForm.stepType === 'mix') {
      // only 1 labware
      return [stepForm.labware]
    }

    // step types that have no labware that gets highlighted
    if (!(stepForm.stepType === 'pause')) {
      // TODO Ian 2018-05-08 use assert here
      console.warn(`getHoveredStepLabware does not support step type "${stepForm.stepType}"`)
    }

    return blank
  }
)

const getStepCreationButtonExpanded: Selector<boolean> = createSelector(
  rootSelector,
  (state: RootState) => state.stepCreationButtonExpanded
)

const getFormSectionCollapsed: Selector<FormSectionState> = createSelector(
  rootSelector,
  s => s.formSectionCollapse
)

const getSelectedStep = createSelector(
  getAllSteps,
  getSelectedStepId,
  (allSteps, selectedStepId) => {
    const stepId = selectedStepId

    if (!allSteps || stepId == null) {
      return null
    }

    return allSteps[stepId]
  }
)

// TODO: BC: 2018-10-26 remove this when we decide to not block save
export const getCurrentFormCanBeSaved: Selector<boolean | null> = createSelector(
  getHydratedUnsavedForm,
  getSelectedStepId,
  getAllSteps,
  (hydratedForm, selectedStepId, allSteps) => {
    if (selectedStepId == null || !allSteps[selectedStepId] || !hydratedForm) return null
    return isEmpty(getAllErrorsFromHydratedForm(hydratedForm))
  }
)

export const getWellSelectionLabwareKey: Selector<?string> = createSelector(
  rootSelector,
  (state: RootState) => state.wellSelectionLabwareKey
)

export default {
  rootSelector,

  getSelectedStep,

  getStepCreationButtonExpanded,
  getSelectedStepId,
  getSelectedTerminalItemId,
  getHoveredTerminalItemId,
  getHoveredStepId,
  getActiveItem,
  getHoveredSubstep,
  getFormSectionCollapsed,
  getHoveredStepLabware,
  getWellSelectionLabwareKey,

  // NOTE: this is exposed only for substeps/selectors.js
  getCollapsedSteps,
}
