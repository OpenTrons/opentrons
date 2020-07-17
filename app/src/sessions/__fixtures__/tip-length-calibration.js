// @flow
import type { TipLengthCalibrationSessionDetails } from '../types'

export const mockTipLengthCalibrationSessionDetails: TipLengthCalibrationSessionDetails = {
  instruments: {
    left: {
      model: 'fake_pipette_model',
      name: 'fake_pipette_name',
      tip_length: 42,
      mount: 'left',
      tiprack_id: 'abc123_labware_uuid',
      rank: 'first',
      serial: 'fake serial 1',
    },
    right: {
      model: 'fake_pipette_model',
      name: 'fake_pipette_name',
      tip_length: 42,
      mount: 'right',
      tiprack_id: 'def456_labware_uuid',
      rank: 'second',
      serial: 'fake serial 2',
    },
  },
  currentStep: 'sessionStarted',
  labware: [
    {
      alternatives: ['fake_tprack_load_name'],
      slot: '8',
      id: 'abc123_labware_uuid',
      forMounts: ['left'],
      loadName: 'opentrons_96_tiprack_300ul',
      namespace: 'opentrons',
      version: 1,
    },
    {
      alternatives: ['fake_block_load_name_short_right'],
      slot: '3',
      id: 'opentrons_calibrationblock_short_side_right',
      forMounts: ['right'],
      loadName: 'opentrons_calibrationblock_short_side_right',
      namespace: 'opentrons',
      version: 1,
    },
    {
      alternatives: ['fake_other_tiprack_load_name'],
      slot: '6',
      id: 'def456_labware_uuid',
      forMounts: ['right'],
      loadName: 'opentrons_96_tiprack_20ul',
      namespace: 'opentrons',
      version: 1,
    },
    {
      alternatives: ['fake_block_load_name_short_left'],
      slot: '1',
      id: 'opentrons_calibrationblock_short_side_left',
      forMounts: ['left'],
      loadName: 'opentrons_calibrationblock_short_side_left',
      namespace: 'opentrons',
      version: 1,
    },
  ],
}
