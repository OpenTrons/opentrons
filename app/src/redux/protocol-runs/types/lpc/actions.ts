import type {
  ConflictTimestampInfo,
  LocationSpecificOffsetLocationDetails,
  LPCStep,
  LPCWizardState,
  OffsetLocationDetails,
} from '/app/redux/protocol-runs/types/lpc'
import type { StoredLabwareOffset, VectorOffset } from '@opentrons/api-client'

export interface PositionParams {
  labwareUri: string
  location: OffsetLocationDetails
  position: VectorOffset
}

export interface UpdateLPCAction {
  type: 'UPDATE_LPC'
  payload: { runId: string; state: LPCWizardState }
}

export interface FinishLPCAction {
  type: 'FINISH_LPC'
  payload: { runId: string }
}

export interface ProceedStepAction {
  type: 'PROCEED_STEP'
  payload: { runId: string; toStep?: LPCStep }
}

export interface GoBackStepAction {
  type: 'GO_BACK_LAST_STEP'
  payload: { runId: string }
}

export interface SelectedLabwareNameAction {
  type: 'SET_SELECTED_LABWARE_URI'
  payload: {
    runId: string
    labwareUri: string
  }
}

export interface SelectedLabwareAction {
  type: 'SET_SELECTED_LABWARE'
  payload: {
    runId: string
    labwareUri: string
    location: OffsetLocationDetails | null
  }
}

export interface InitialPositionAction {
  type: 'SET_INITIAL_POSITION'
  payload: PositionParams & { runId: string }
}

export interface FinalPositionAction {
  type: 'SET_FINAL_POSITION'
  payload: PositionParams & { runId: string }
}

export interface ClearSelectedLabwareWorkingOffsetsAction {
  type: 'CLEAR_WORKING_OFFSETS'
  payload: { runId: string; labwareUri: string }
}

export interface ResetLocationSpecificOffsetToDefaultAction {
  type: 'RESET_OFFSET_TO_DEFAULT'
  payload: {
    runId: string
    labwareUri: string
    location: LocationSpecificOffsetLocationDetails
  }
}

export interface ApplyWorkingOffsetsAction {
  type: 'APPLY_WORKING_OFFSETS'
  payload: { runId: string; saveResult: StoredLabwareOffset[] }
}

export interface ProceedHandleLwSubstepAction {
  type: 'PROCEED_HANDLE_LW_SUBSTEP'
  payload: { runId: string; isDesktop?: boolean }
}

export interface GoBackHandleLwSubstepAction {
  type: 'GO_BACK_HANDLE_LW_SUBSTEP'
  payload: { runId: string }
}

export interface AppliedOffsetsToRunAction {
  type: 'APPLIED_OFFSETS_TO_RUN'
  payload: { runId: string }
}

export interface SourceOffsetsFromRunAction {
  type: 'SOURCE_OFFSETS_FROM_RUN'
  payload: { runId: string }
}

export interface SourceOffsetsFromDatabaseAction {
  type: 'SOURCE_OFFSETS_FROM_DATABASE'
  payload: { runId: string }
}

export interface UpdateConflictTimestampAction {
  type: 'UPDATE_CONFLICT_TIMESTAMP'
  payload: { runId: string; info: ConflictTimestampInfo }
}

export type LPCWizardAction =
  | UpdateLPCAction
  | FinishLPCAction
  | SelectedLabwareNameAction
  | SelectedLabwareAction
  | InitialPositionAction
  | FinalPositionAction
  | ClearSelectedLabwareWorkingOffsetsAction
  | ResetLocationSpecificOffsetToDefaultAction
  | ApplyWorkingOffsetsAction
  | ProceedStepAction
  | GoBackStepAction
  | ProceedHandleLwSubstepAction
  | GoBackHandleLwSubstepAction
  | AppliedOffsetsToRunAction
  | SourceOffsetsFromRunAction
  | SourceOffsetsFromDatabaseAction
  | UpdateConflictTimestampAction
