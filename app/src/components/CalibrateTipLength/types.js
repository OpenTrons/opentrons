// @flow

import type {
  SessionCommandString,
  SessionCommandData,
  TipLengthCalibrationSession,
} from '../../sessions/types'
import type { TipLengthCalibrationLabware } from '../../sessions/tip-length-calibration/types'

export type CalibrateTipLengthParentProps = {|
  robotName: string,
  session: TipLengthCalibrationSession | null,
  closeWizard: () => void,
  hasBlock: boolean,
|}

export type CalibrateTipLengthChildProps = {|
  isMulti: boolean,
  mount: string,
  tipRack: TipLengthCalibrationLabware,
  calBlock: TipLengthCalibrationLabware | null,
  sendSessionCommand: (
    command: SessionCommandString,
    data?: SessionCommandData,
    trackRequest?: boolean
  ) => void,
  deleteSession: () => void,
|}
