import {
  PROCEED_STEP,
  SET_INITIAL_POSITION,
  SET_FINAL_POSITION,
  UPDATE_LPC,
  FINISH_LPC,
  GO_BACK_LAST_STEP,
  SET_SELECTED_LABWARE,
  SET_SELECTED_LABWARE_URI,
  APPLY_WORKING_OFFSETS,
  PROCEED_HANDLE_LW_SUBSTEP,
  GO_BACK_HANDLE_LW_SUBSTEP,
  RESET_OFFSET_TO_DEFAULT,
  CLEAR_WORKING_OFFSETS,
  APPLIED_OFFSETS_TO_RUN,
  SOURCE_OFFSETS_FROM_RUN,
  SOURCE_OFFSETS_FROM_DATABASE,
  UPDATE_CONFLICT_TIMESTAMP,
} from '../constants'

import type {
  FinalPositionAction,
  InitialPositionAction,
  UpdateLPCAction,
  LPCWizardState,
  PositionParams,
  ProceedStepAction,
  FinishLPCAction,
  GoBackStepAction,
  SelectedLabwareAction,
  SelectedLabwareNameAction,
  OffsetLocationDetails,
  ApplyWorkingOffsetsAction,
  LPCStep,
  ProceedHandleLwSubstepAction,
  GoBackHandleLwSubstepAction,
  LocationSpecificOffsetLocationDetails,
  ResetLocationSpecificOffsetToDefaultAction,
  ClearSelectedLabwareWorkingOffsetsAction,
  AppliedOffsetsToRunAction,
  SourceOffsetsFromRunAction,
  SourceOffsetsFromDatabaseAction,
  UpdateConflictTimestampAction,
  ConflictTimestampInfo,
} from '../types'
import type { StoredLabwareOffset } from '@opentrons/api-client'

export const proceedStep = (
  runId: string,
  toStep?: LPCStep
): ProceedStepAction => ({
  type: PROCEED_STEP,
  payload: { runId, toStep },
})

export const goBackLastStep = (runId: string): GoBackStepAction => ({
  type: GO_BACK_LAST_STEP,
  payload: { runId },
})

export const setSelectedLabwareUri = (
  runId: string,
  labwareUri: string
): SelectedLabwareNameAction => ({
  type: SET_SELECTED_LABWARE_URI,
  payload: {
    runId,
    labwareUri,
  },
})

export const setSelectedLabware = (
  runId: string,
  labwareUri: string,
  location: OffsetLocationDetails | null
): SelectedLabwareAction => ({
  type: SET_SELECTED_LABWARE,
  payload: {
    runId,
    labwareUri,
    location,
  },
})

export const setInitialPosition = (
  runId: string,
  params: PositionParams
): InitialPositionAction => ({
  type: SET_INITIAL_POSITION,
  payload: { ...params, runId },
})

export const setFinalPosition = (
  runId: string,
  params: PositionParams
): FinalPositionAction => ({
  type: SET_FINAL_POSITION,
  payload: { ...params, runId },
})

export const resetLocationSpecificOffsetToDefault = (
  runId: string,
  labwareUri: string,
  location: LocationSpecificOffsetLocationDetails
): ResetLocationSpecificOffsetToDefaultAction => ({
  type: RESET_OFFSET_TO_DEFAULT,
  payload: { runId, labwareUri, location },
})

export const clearSelectedLabwareWorkingOffsets = (
  runId: string,
  labwareUri: string
): ClearSelectedLabwareWorkingOffsetsAction => ({
  type: CLEAR_WORKING_OFFSETS,
  payload: { runId, labwareUri },
})

export const applyWorkingOffsets = (
  runId: string,
  saveResult: StoredLabwareOffset[]
): ApplyWorkingOffsetsAction => ({
  type: APPLY_WORKING_OFFSETS,
  payload: { runId, saveResult },
})

export const updateLPC = (
  runId: string,
  state: LPCWizardState
): UpdateLPCAction => ({
  type: UPDATE_LPC,
  payload: { runId, state },
})

export const closeLPC = (runId: string): FinishLPCAction => ({
  type: FINISH_LPC,
  payload: { runId },
})

export const proceedEditOffsetSubstep = (
  runId: string,
  isDesktop?: boolean
): ProceedHandleLwSubstepAction => ({
  type: PROCEED_HANDLE_LW_SUBSTEP,
  payload: { runId, isDesktop },
})

export const goBackEditOffsetSubstep = (
  runId: string
): GoBackHandleLwSubstepAction => ({
  type: GO_BACK_HANDLE_LW_SUBSTEP,
  payload: { runId },
})

export const appliedOffsetsToRun = (
  runId: string
): AppliedOffsetsToRunAction => ({
  type: APPLIED_OFFSETS_TO_RUN,
  payload: { runId },
})

export const sourceOffsetsFromRun = (
  runId: string
): SourceOffsetsFromRunAction => ({
  type: SOURCE_OFFSETS_FROM_RUN,
  payload: { runId },
})

export const sourceOffsetsFromDatabase = (
  runId: string
): SourceOffsetsFromDatabaseAction => ({
  type: SOURCE_OFFSETS_FROM_DATABASE,
  payload: { runId },
})

export const updateConflictTimestamp = (
  runId: string,
  info: ConflictTimestampInfo
): UpdateConflictTimestampAction => ({
  type: UPDATE_CONFLICT_TIMESTAMP,
  payload: { runId, info },
})
