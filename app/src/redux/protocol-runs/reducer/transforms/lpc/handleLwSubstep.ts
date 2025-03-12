import { HANDLE_LW_SUBSTEP } from '../../../constants'

import type { HandleLwSubstepType, LPCWizardState } from '../../../types'

// Handles proceed to next substep for the "handle labware" core LPC flow.
// Certain steps require special state updates.
export function proceedToNextHandleLwSubstep(
  state: LPCWizardState,
  isDesktop?: boolean
): LPCWizardState {
  const currentSubstep = state.steps.currentSubstep
  const selectedLw = state.labwareInfo.selectedLabware

  // Note that this is a closed loop.
  const getNextSubStep = (): HandleLwSubstepType | null => {
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

  if (getNextSubStep() === HANDLE_LW_SUBSTEP.LIST) {
    return {
      ...state,
      labwareInfo: {
        ...state.labwareInfo,
        selectedLabware: null,
      },
      steps: { ...state.steps, currentSubstep: getNextSubStep() },
    }
  } else if (getNextSubStep() === HANDLE_LW_SUBSTEP.DETAILS) {
    if (selectedLw == null) {
      console.error('Cannot proceed substep if labware is not set.')
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
        steps: { ...state.steps, currentSubstep: getNextSubStep() },
      }
    }
  } else if (
    getNextSubStep() === HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW &&
    selectedLw?.offsetLocationDetails == null
  ) {
    console.error('Cannot proceed substep if details are not set.')
    return {
      ...state,
      steps: { ...state.steps, currentSubstep: getNextSubStep() },
    }
  } else {
    return {
      ...state,
      steps: { ...state.steps, currentSubstep: getNextSubStep() },
    }
  }
}

// Handles go back previous substep for the "handle labware" core LPC flow.
// Certain steps require special state updates.
export function goBackToPreviousHandleLwSubstep(
  state: LPCWizardState
): LPCWizardState {
  const currentSubstep = state.steps.currentSubstep

  // Note that this is a closed loop.
  const getPrevSubStep = (): HandleLwSubstepType | null => {
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

  if (getPrevSubStep() === HANDLE_LW_SUBSTEP.LIST) {
    return {
      ...state,
      labwareInfo: {
        ...state.labwareInfo,
        selectedLabware: null,
      },
      steps: { ...state.steps, currentSubstep: getPrevSubStep() },
    }
  } else if (getPrevSubStep() === HANDLE_LW_SUBSTEP.DETAILS) {
    const selectedLw = state.labwareInfo.selectedLabware

    if (selectedLw == null) {
      console.error('Cannot go back substep if labware is not set.')
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
        steps: { ...state.steps, currentSubstep: getPrevSubStep() },
      }
    }
  } else {
    return {
      ...state,
      steps: { ...state.steps, currentSubstep: getPrevSubStep() },
    }
  }
}
