import {
  APPLIED_OFFSETS_TO_RUN,
  APPLY_WORKING_OFFSETS,
  CLEAR_WORKING_OFFSETS,
  FINISH_LPC,
  GO_BACK_HANDLE_LW_SUBSTEP,
  GO_BACK_LAST_STEP,
  LPC_STEPS,
  OFFSETS_CONFLICT,
  OFFSETS_FROM_DATABASE,
  OFFSETS_FROM_RUN_RECORD,
  PROCEED_HANDLE_LW_SUBSTEP,
  PROCEED_STEP,
  RESET_OFFSET_TO_DEFAULT,
  SET_FINAL_POSITION,
  SET_INITIAL_POSITION,
  SET_SELECTED_LABWARE,
  SET_SELECTED_LABWARE_URI,
  SOURCE_OFFSETS_FROM_DATABASE,
  SOURCE_OFFSETS_FROM_RUN,
  UPDATE_CONFLICT_TIMESTAMP,
  UPDATE_LPC,
  UPDATE_LPC_DECK,
  UPDATE_LPC_LABWARE,
} from '../constants'
import {
  clearAllWorkingOffsets,
  getNextStepIdx,
  goBackToPreviousHandleLwSubstep,
  handleApplyWorkingOffsets,
  proceedToNextHandleLwSubstep,
  updateLPCLabwareInfoFrom,
  updateOffsetsForURI,
} from './transforms'

import type {
  LPCLabwareInfo,
  LPCWizardAction,
  LPCWizardState,
  OffsetSources,
  SelectedLwOverview,
} from '../types'

// TODO(jh, 01-17-25): A lot of this state should live above the LPC slice, in the general protocolRuns slice instead.
//  We should make selectors for that state, too!
export function LPCReducer(
  state: LPCWizardState | undefined,
  action: LPCWizardAction
): LPCWizardState | undefined {
  if (action.type === UPDATE_LPC) {
    return action.payload.state
  } else if (state == null) {
    return undefined
  } else {
    switch (action.type) {
      case UPDATE_LPC_DECK: {
        return {
          ...state,
          deckConfig: action.payload.deck,
        }
      }

      case UPDATE_LPC_LABWARE: {
        return {
          ...state,
          labwareInfo: action.payload.labware,
        }
      }

      case PROCEED_STEP: {
        const { currentStepIndex, lastStepIndices } = state.steps

        return {
          ...state,
          steps: {
            ...state.steps,
            currentStepIndex: getNextStepIdx(action, state.steps),
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

      case APPLIED_OFFSETS_TO_RUN: {
        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            areOffsetsApplied: true,
          },
        }
      }

      case SOURCE_OFFSETS_FROM_RUN: {
        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            labware: updateLPCLabwareInfoFrom(
              state.labwareInfo.initialRunRecordOffsets,
              state.labwareInfo.labware
            ),
            sourcedOffsets: OFFSETS_FROM_RUN_RECORD,
          },
        }
      }

      case SOURCE_OFFSETS_FROM_DATABASE: {
        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            sourcedOffsets: OFFSETS_FROM_DATABASE,
          },
        }
      }

      case UPDATE_CONFLICT_TIMESTAMP: {
        const { info } = action.payload

        const noDbOffsets =
          state.labwareInfo.initialDatabaseOffsets.length === 0

        const offsetSource = (): OffsetSources => {
          if (info.timestamp == null) {
            if (noDbOffsets) {
              return OFFSETS_FROM_RUN_RECORD
            } else {
              return OFFSETS_FROM_DATABASE
            }
          } else {
            return OFFSETS_CONFLICT
          }
        }

        const updatedLw = (): LPCLabwareInfo['labware'] => {
          switch (offsetSource()) {
            case OFFSETS_FROM_RUN_RECORD: {
              return updateLPCLabwareInfoFrom(
                state.labwareInfo.initialRunRecordOffsets,
                state.labwareInfo.labware
              )
            }
            default:
              return state.labwareInfo.labware
          }
        }

        return {
          ...state,
          labwareInfo: {
            ...state.labwareInfo,
            conflictTimestampInfo: info,
            sourcedOffsets: offsetSource(),
            labware: updatedLw(),
          },
        }
      }

      default:
        return state
    }
  }
}
