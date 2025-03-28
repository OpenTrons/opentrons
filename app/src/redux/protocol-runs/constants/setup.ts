export const ROBOT_CALIBRATION_STEP_KEY: 'robot_calibration_step' =
  'robot_calibration_step'
export const MODULE_SETUP_STEP_KEY: 'module_setup_step' = 'module_setup_step'
export const LPC_STEP_KEY: 'labware_position_check_step' =
  'labware_position_check_step'
export const LABWARE_SETUP_STEP_KEY: 'labware_liquids_setup_step' =
  'labware_liquids_setup_step'

export const SETUP_STEP_KEYS = [
  ROBOT_CALIBRATION_STEP_KEY,
  MODULE_SETUP_STEP_KEY,
  LPC_STEP_KEY,
  LABWARE_SETUP_STEP_KEY,
] as const

export const UPDATE_RUN_SETUP_STEPS_COMPLETE = 'protocolRuns:UPDATE_RUN_SETUP_STEPS_COMPLETE' as const
export const UPDATE_RUN_SETUP_STEPS_REQUIRED = 'protocolRuns:UPDATE_RUN_SETUP_STEPS_REQUIRED' as const
