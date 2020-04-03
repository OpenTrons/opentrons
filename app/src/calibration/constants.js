// @flow
// domain layer constants

export const CREATE_ROBOT_CALIBRATION_CHECK_SESSION: 'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION' =
  'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION'

export const CREATE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS: 'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS' =
  'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS'

export const CREATE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE: 'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE' =
  'calibration:CREATE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE'

export const DELETE_ROBOT_CALIBRATION_CHECK_SESSION: 'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION' =
  'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION'

export const DELETE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS: 'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS' =
  'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION_SUCCESS'

export const DELETE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE: 'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE' =
  'calibration:DELETE_ROBOT_CALIBRATION_CHECK_SESSION_FAILURE'

export const COMPLETE_ROBOT_CALIBRATION_CHECK: 'calibration:COMPLETE_ROBOT_CALIBRATION_CHECK' =
  'calibration:COMPLETE_ROBOT_CALIBRATION_CHECK'

// api constants

export const ROBOT_CALIBRATION_CHECK_PATH: '/calibration/check/session' =
  '/calibration/check/session'

export const CHECK_STEP_SESSION_START: 'sessionStart' = 'sessionStart'
export const CHECK_STEP_LOAD_LABWARE: 'loadLabware' = 'loadLabware'
export const CHECK_STEP_PICK_UP_TIP: 'pickUpTip' = 'pickUpTip'
export const CHECK_STEP_CHECK_POINT_ONE: 'checkPointOne' = 'checkPointOne'
export const CHECK_STEP_CHECK_POINT_TWO: 'checkPointTwo' = 'checkPointTwo'
export const CHECK_STEP_CHECK_POINT_THREE: 'checkPointThree' = 'checkPointThree'
export const CHECK_STEP_CHECK_HEIGHT: 'checkHeight' = 'checkHeight'
export const CHECK_STEP_SESSION_EXIT: 'sessionExit' = 'sessionExit'
export const CHECK_STEP_BAD_ROBOT_CALIBRATION: 'badRobotCalibration' =
  'badRobotCalibration'
export const CHECK_STEP_NO_PIPETTES_ATTACHED: 'noPipettesAttached' =
  'noPipettesAttached'
