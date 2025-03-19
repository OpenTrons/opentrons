import {
  PROCEED_STEP,
  SET_SELECTED_LABWARE,
  SET_INITIAL_POSITION,
  SET_FINAL_POSITION,
  FINISH_LPC,
  START_LPC,
  GO_BACK_LAST_STEP,
  SET_SELECTED_LABWARE_URI,
  APPLY_WORKING_OFFSETS,
  LPC_STEPS,
  PROCEED_HANDLE_LW_SUBSTEP,
  GO_BACK_HANDLE_LW_SUBSTEP,
  RESET_OFFSET_TO_DEFAULT,
  CLEAR_WORKING_OFFSETS,
} from '../constants'
import {
  updateOffsetsForURI,
  proceedToNextHandleLwSubstep,
  goBackToPreviousHandleLwSubstep,
  handleApplyWorkingOffsets,
  clearAllWorkingOffsets,
} from './transforms'

import type {
  LPCWizardAction,
  LPCWizardState,
  SelectedLwOverview,
} from '../types'

// TODO(jh, 03-10-25): Move some of these reducer case transformations to dedicated transform fns for clarity.
// TODO(jh, 01-17-25): A lot of this state should live above the LPC slice, in the general protocolRuns slice instead.
//  We should make selectors for that state, too!
export function LPCReducer(
  state: LPCWizardState | undefined,
  action: LPCWizardAction
): LPCWizardState | undefined {
  if (action.type === START_LPC) {
    return action.payload.state
  } else if (state == null) {
    return undefined
  } else {
    switch (action.type) {
      case PROCEED_STEP: {
        const {
          currentStepIndex,
          lastStepIndices,
          totalStepCount,
        } = state.steps
        const { toStep } = action.payload

        const newStepIdx = (): number => {
          if (toStep == null) {
            return currentStepIndex + 1 < totalStepCount
              ? currentStepIndex + 1
              : currentStepIndex
          } else {
            const newIdx = LPC_STEPS.findIndex(step => step === toStep)

            if (newIdx === -1) {
              console.error(`Unexpected routing to step: ${toStep}`)
              return 0
            } else {
              return newIdx
            }
          }
        }

        return {
          ...state,
          steps: {
            ...state.steps,
            currentStepIndex: newStepIdx(),
            lastStepIndices: [...(lastStepIndices ?? []), currentStepIndex],
          },
        }
      }

      case GO_BACK_LAST_STEP: {
        const { lastStepIndices } = state.steps
        const lastStep = lastStepIndices?.[lastStepIndices.length - 1] ?? 0

        return {
          ...state,
          steps: {
            ...state.steps,
            currentStepIndex: lastStep,
            lastStepIndices:
              lastStepIndices?.slice(0, lastStepIndices.length - 1) ?? null,
          },
        }
      }

      case PROCEED_HANDLE_LW_SUBSTEP: {
        const { isDesktop } = action.payload
        return proceedToNextHandleLwSubstep(state, isDesktop)
      }

      case GO_BACK_HANDLE_LW_SUBSTEP: {
        return goBackToPreviousHandleLwSubstep(state)
      }

      case SET_SELECTED_LABWARE_URI: {
        const lwUri = action.payload.labwareUri
        const thisLwInfo = state.labwareInfo.labware[lwUri]

        const selectedLabware: SelectedLwOverview = {
          uri: action.payload.labwareUri,
          id: thisLwInfo.id,
          offsetLocationDetails: null,
        }

        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            selectedLabware,
          },
        }
      }

      case SET_SELECTED_LABWARE: {
        const lwUri = action.payload.labwareUri
        const thisLwInfo = state.labwareInfo.labware[lwUri]

        const selectedLabware: SelectedLwOverview = {
          uri: action.payload.labwareUri,
          id: thisLwInfo.id,
          offsetLocationDetails: action.payload.location,
        }

        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            selectedLabware,
          },
        }
      }

      case SET_INITIAL_POSITION:
      case SET_FINAL_POSITION:
      case CLEAR_WORKING_OFFSETS:
      case RESET_OFFSET_TO_DEFAULT: {
        const lwUri = action.payload.labwareUri
        const updatedLwDetails = updateOffsetsForURI(state, action)

        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            labware: {
              ...state.labwareInfo.labware,
              [lwUri]: {
                ...state.labwareInfo.labware[lwUri],
                ...updatedLwDetails,
              },
            },
          },
        }
      }

      case APPLY_WORKING_OFFSETS: {
        const updatedLabware = handleApplyWorkingOffsets(state, action)

        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            labware: {
              ...updatedLabware,
            },
          },
        }
      }

      // TODO(jh, 03-12-25): Revisit whether we need to set the store back to undefined, and
      // if we can avoid having an `undefined` store at any point in the store's lifecycle.
      case FINISH_LPC:
        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            selectedLabware: null,
            labware: clearAllWorkingOffsets(state.labwareInfo.labware),
          },
          maintenanceRunId: null,
          steps: {
            currentStepIndex: 0,
            totalStepCount: LPC_STEPS.length,
            all: LPC_STEPS,
            lastStepIndices: null,
            currentSubstep: null,
          },
        }

      default:
        return state
    }
  }
}
