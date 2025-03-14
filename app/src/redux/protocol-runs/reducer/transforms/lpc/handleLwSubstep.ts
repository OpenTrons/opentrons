import { HANDLE_LW_SUBSTEP } from '../../../constants'

import type { HandleLwSubstepType, LPCWizardState } from '../../../types'

// Handles proceed to next substep for the "handle labware" core LPC flow.
// Certain steps require special state updates.
export function proceedToNextHandleLwSubstep(
  state: LPCWizardState,
  isDesktop?: boolean
): LPCWizardState {
  const nextSubstep = getNextHandleLwSubstep(
    state.steps.currentSubstep,
    isDesktop
  )

  if (nextSubstep === HANDLE_LW_SUBSTEP.LIST) {
    return handleTransitionToList(state)
  } else if (nextSubstep === HANDLE_LW_SUBSTEP.DETAILS) {
    return handleTransitionToDetails(state)
  } else {
    return updateCurrentSubstep(state, nextSubstep)
  }
}

// Handles go back previous substep for the "handle labware" core LPC flow.
// Certain steps require special state updates.
export function goBackToPreviousHandleLwSubstep(
  state: LPCWizardState
): LPCWizardState {
  const prevSubstep = getPreviousHandleLwSubstep(state.steps.currentSubstep)

  if (prevSubstep === HANDLE_LW_SUBSTEP.LIST) {
    return handleTransitionToList(state)
  } else if (prevSubstep === HANDLE_LW_SUBSTEP.DETAILS) {
    return handleTransitionToDetails(state)
  } else {
    return updateCurrentSubstep(state, prevSubstep)
  }
}

// Get the next substep in the flow.
function getNextHandleLwSubstep(
  currentSubstep: HandleLwSubstepType | null,
  isDesktop?: boolean
): HandleLwSubstepType | null {
  switch (currentSubstep) {
    case null:
      return HANDLE_LW_SUBSTEP.LIST
    case HANDLE_LW_SUBSTEP.LIST:
      return HANDLE_LW_SUBSTEP.DETAILS
    case HANDLE_LW_SUBSTEP.DETAILS:
      return HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW:
      return HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW: {
      if (isDesktop) {
        return HANDLE_LW_SUBSTEP.EDIT_OFFSET_SUCCESS
      } else {
        return HANDLE_LW_SUBSTEP.DETAILS
      }
    }
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_SUCCESS:
      return HANDLE_LW_SUBSTEP.DETAILS
  }
}

// Get the previous substep in the flow.
function getPreviousHandleLwSubstep(
  currentSubstep: HandleLwSubstepType | null
): HandleLwSubstepType | null {
  switch (currentSubstep) {
    case null:
      return HANDLE_LW_SUBSTEP.LIST
    case HANDLE_LW_SUBSTEP.LIST:
      return HANDLE_LW_SUBSTEP.LIST
    case HANDLE_LW_SUBSTEP.DETAILS:
      return HANDLE_LW_SUBSTEP.LIST
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW:
      return HANDLE_LW_SUBSTEP.DETAILS
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW:
      return HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW
    case HANDLE_LW_SUBSTEP.EDIT_OFFSET_SUCCESS:
      return HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW
  }
}

// Handle transition to "List" substep.
function handleTransitionToList(state: LPCWizardState): LPCWizardState {
  return {
    ...state,
    labwareInfo: {
      ...state.labwareInfo,
      selectedLabware: null,
    },
    steps: {
      ...state.steps,
      currentSubstep: HANDLE_LW_SUBSTEP.LIST,
    },
  }
}

// Handle transition to "Details" substep.
function handleTransitionToDetails(state: LPCWizardState): LPCWizardState {
  const selectedLw = state.labwareInfo.selectedLabware

  if (selectedLw == null) {
    console.error('Cannot proceed/go back to details substep.')
    return state
  } else {
    return {
      ...state,
      labwareInfo: {
        ...state.labwareInfo,
        selectedLabware: {
          ...selectedLw,
          offsetLocationDetails: null,
        },
      },
      steps: {
        ...state.steps,
        currentSubstep: HANDLE_LW_SUBSTEP.DETAILS,
      },
    }
  }
}

// The simple/default update substep state case.
function updateCurrentSubstep(
  state: LPCWizardState,
  substep: HandleLwSubstepType | null
): LPCWizardState {
  return {
    ...state,
    steps: {
      ...state.steps,
      currentSubstep: substep,
    },
  }
}
