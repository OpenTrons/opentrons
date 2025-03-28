import type {
  ROBOT_CALIBRATION_STEP_KEY,
  MODULE_SETUP_STEP_KEY,
  LPC_STEP_KEY,
  LABWARE_SETUP_STEP_KEY,
  UPDATE_RUN_SETUP_STEPS_COMPLETE,
  UPDATE_RUN_SETUP_STEPS_REQUIRED,
} from '../constants'

export type RobotCalibrationStepKey = typeof ROBOT_CALIBRATION_STEP_KEY
export type ModuleSetupStepKey = typeof MODULE_SETUP_STEP_KEY
export type LPCStepKey = typeof LPC_STEP_KEY
export type LabwareSetupStepKey = typeof LABWARE_SETUP_STEP_KEY

export type StepKey =
  | RobotCalibrationStepKey
  | ModuleSetupStepKey
  | LPCStepKey
  | LabwareSetupStepKey

export interface StepState {
  required: boolean
  complete: boolean
}

export type StepMap<V> = { [Step in StepKey]: V }

export type RunSetupStatus = {
  [Step in StepKey]: StepState
}

export interface UpdateRunSetupStepsCompleteAction {
  type: typeof UPDATE_RUN_SETUP_STEPS_COMPLETE
  payload: {
    runId: string
    complete: Partial<{ [Step in StepKey]: boolean }>
  }
}

export interface UpdateRunSetupStepsRequiredAction {
  type: typeof UPDATE_RUN_SETUP_STEPS_REQUIRED
  payload: {
    runId: string
    required: Partial<{ [Step in StepKey]: boolean }>
  }
}

export type RunSetupStepsAction =
  | UpdateRunSetupStepsCompleteAction
  | UpdateRunSetupStepsRequiredAction
