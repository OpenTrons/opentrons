// @flow
// pipette offset calibration session constants
import { sharedCalCommands } from '../common-calibration/constants'

export const PIP_OFFSET_STEP_SESSION_STARTED: 'sessionStarted' =
  'sessionStarted'
export const PIP_OFFSET_STEP_LABWARE_LOADED: 'labwareLoaded' = 'labwareLoaded'

export const PIP_OFFSET_STEP_MEASURING_NOZZLE_OFFSET: 'measuringNozzleOffset' =
  'measuringNozzleOffset'
export const PIP_OFFSET_STEP_MEASURING_TIP_OFFSET: 'measuringTipOffset' =
  'measuringTipOffset'
export const PIP_OFFSET_STEP_PREPARING_PIPETTE: 'preparingPipette' =
  'preparingPipette'
export const PIP_OFFSET_STEP_INSPECTING_TIP: 'inspectingTip' = 'inspectingTip'
export const PIP_OFFSET_STEP_JOGGING_TO_DECK: 'joggingToDeck' = 'joggingToDeck'
export const PIP_OFFSET_STEP_SAVING_POINT_ONE: 'savingPointOne' =
  'savingPointOne'
export const PIP_OFFSET_STEP_CALIBRATION_COMPLETE: 'calibrationComplete' =
  'calibrationComplete'
export const PIP_OFFSET_STEP_COMPLETE_TIP_LENGTH: 'tipLengthComplete' =
  'tipLengthComplete'
export const PIP_OFFSET_STEP_SESSION_EXITED: 'sessionExited' = 'sessionExited'

const TIP_LENGTH_COMPLETE: 'calibration.pipetteOffset.tipLengthComplete' =
  'calibration.pipetteOffset.tipLengthComplete'

export const pipOffsetCalCommands = {
  ...sharedCalCommands,
  TIP_LENGTH_COMPLETE,
}
