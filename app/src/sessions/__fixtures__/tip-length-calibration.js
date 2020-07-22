// @flow
import type { TipLengthCalibrationSessionDetails } from '../types'
import type { TipLengthCalibrationSessionParams } from '../tip-length-calibration/types'

export const mockTipLengthCalibrationSessionDetails: TipLengthCalibrationSessionDetails = {
  instrument: {
    model: 'fake_pipette_model',
    name: 'fake_pipette_name',
    tip_length: 42,
    mount: 'right',
    serial: 'fake serial 2',
  },
  currentStep: 'labwareLoaded',
  labware: [
    {
      alternatives: ['fake_tprack_load_name'],
      slot: '8',
      loadName: 'opentrons_96_tiprack_300ul',
      namespace: 'opentrons',
      version: 1,
      isTiprack: true,
    },
    {
      alternatives: ['fake_block_load_name_short_left'],
      slot: '1',
      loadName: 'opentrons_calibrationblock_short_side_left',
      namespace: 'opentrons',
      version: 1,
      isTiprack: false,
    },
  ],
}

export const mockTipLengthCalibrationSessionParams: TipLengthCalibrationSessionParams = {
  mount: 'left',
  hasCalibrationBlock: true,
}
