// @flow
import forEach from 'lodash/forEach'
import { MAIN_CONTENT_FORCED_SCROLL_CLASSNAME } from '../constants'
import { selectors as stepFormSelectors } from '../../../step-forms'
import {
  getNextDefaultPipetteId,
  handleFormChange,
} from '../../../steplist/formLevel'
import type { StepIdType, StepType } from '../../../form-types'
import type { GetState, ThunkAction, ThunkDispatch } from '../../../types'
import type { TerminalItemId, SubstepIdentifier } from '../../../steplist/types'
import type {
  ExpandAddStepButtonAction,
  ToggleStepCollapsedAction,
  HoverOnStepAction,
  HoverOnSubstepAction,
  SelectTerminalItemAction,
  HoverOnTerminalItemAction,
  SetWellSelectionLabwareKeyAction,
  ClearWellSelectionLabwareKeyAction,
  SelectStepAction,
} from './types'

export const expandAddStepButton = (
  payload: boolean
): ExpandAddStepButtonAction => ({
  type: 'EXPAND_ADD_STEP_BUTTON',
  payload,
})

export const toggleStepCollapsed = (
  stepId: StepIdType
): ToggleStepCollapsedAction => ({
  type: 'TOGGLE_STEP_COLLAPSED',
  payload: stepId,
})

export const hoverOnSubstep = (
  payload: SubstepIdentifier
): HoverOnSubstepAction => ({
  type: 'HOVER_ON_SUBSTEP',
  payload: payload,
})

export const selectTerminalItem = (
  terminalId: TerminalItemId
): SelectTerminalItemAction => ({
  type: 'SELECT_TERMINAL_ITEM',
  payload: terminalId,
})

export const hoverOnStep = (stepId: ?StepIdType): HoverOnStepAction => ({
  type: 'HOVER_ON_STEP',
  payload: stepId,
})

export const hoverOnTerminalItem = (
  terminalId: ?TerminalItemId
): HoverOnTerminalItemAction => ({
  type: 'HOVER_ON_TERMINAL_ITEM',
  payload: terminalId,
})

export const setWellSelectionLabwareKey = (
  labwareName: ?string
): SetWellSelectionLabwareKeyAction => ({
  type: 'SET_WELL_SELECTION_LABWARE_KEY',
  payload: labwareName,
})

export const clearWellSelectionLabwareKey = (): ClearWellSelectionLabwareKeyAction => ({
  type: 'CLEAR_WELL_SELECTION_LABWARE_KEY',
  payload: null,
})

// NOTE: 'newStepType' arg is only used when generating a new step
export const selectStep = (
  stepId: StepIdType,
  newStepType?: StepType
): ThunkAction<*> => (dispatch: ThunkDispatch<*>, getState: GetState) => {
  const selectStepAction: SelectStepAction = {
    type: 'SELECT_STEP',
    payload: stepId,
  }

  dispatch(selectStepAction)

  const state = getState()
  let formData = stepFormSelectors._getStepFormData(state, stepId, newStepType)

  const defaultPipetteId = getNextDefaultPipetteId(
    stepFormSelectors.getSavedStepForms(state),
    stepFormSelectors.getOrderedStepIds(state),
    stepFormSelectors.getInitialDeckSetup(state).pipettes
  )

  // For a pristine step, if there is a `pipette` field in the form
  // (added by upstream `getDefaultsForStepType` fn),
  // then set `pipette` field of new steps to the next default pipette id.
  //
  // In order to trigger dependent field changes (eg default disposal volume),
  // update the form thru handleFormChange.
  const formHasPipetteField = formData && 'pipette' in formData
  if (newStepType && formHasPipetteField && defaultPipetteId) {
    const updatedFields = handleFormChange(
      { pipette: defaultPipetteId },
      formData,
      stepFormSelectors.getPipetteEntities(state),
      stepFormSelectors.getLabwareEntities(state)
    )

    formData = {
      ...formData,
      ...updatedFields,
    }
  }

  dispatch({
    type: 'POPULATE_FORM',
    payload: formData,
  })

  // scroll to top of all elements with the special class
  forEach(
    global.document.getElementsByClassName(
      MAIN_CONTENT_FORCED_SCROLL_CLASSNAME
    ),
    elem => {
      elem.scrollTop = 0
    }
  )
}
