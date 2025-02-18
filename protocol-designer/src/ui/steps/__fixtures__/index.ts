import type { SavedStepFormState } from '../../../step-forms'
export const getMockMoveLiquidStep = (): SavedStepFormState => ({
  move_liquid_step_id: {
    pipette: 'some_pipette_id',
    volume: '30',
    changeTip: 'always',
    path: 'single',
    aspirate_wells_grouped: false,
    aspirate_flowRate: null,
    aspirate_labware: 'aspirate_labware_id',
    aspirate_wells: ['A1', 'B1'],
    aspirate_wellOrder_first: 't2b',
    aspirate_wellOrder_second: 'l2r',
    aspirate_mix_checkbox: true,
    aspirate_mix_times: '2',
    aspirate_mix_volume: '5',
    aspirate_mmFromBottom: 1,
    aspirate_touchTip_checkbox: true,
    aspirate_touchTip_mmFromTop: -1,
    dispense_flowRate: null,
    dispense_labware: 'dispense_labware_id',
    dispense_wells: ['A1'],
    dispense_wellOrder_first: 't2b',
    dispense_wellOrder_second: 'l2r',
    dispense_mix_checkbox: true,
    dispense_mix_times: null,
    dispense_mix_volume: null,
    dispense_mmFromBottom: 0.5,
    dispense_touchTip_checkbox: true,
    dispense_touchTip_mmFromTop: -1,
    disposalVolume_checkbox: true,
    disposalVolume_volume: '20',
    blowout_checkbox: true,
    blowout_location: 'fixedTrash',
    preWetTip: false,
    aspirate_airGap_checkbox: true,
    aspirate_airGap_volume: '30',
    dispense_airGap_checkbox: true,
    dispense_airGap_volume: null,
    aspirate_delay_checkbox: true,
    aspirate_delay_mmFromBottom: '1',
    aspirate_delay_seconds: '2',
    dispense_delay_checkbox: true,
    dispense_delay_seconds: '1',
    dispense_delay_mmFromBottom: '0.5',
    id: 'move_liquid_step_id',
    stepType: 'moveLiquid',
    stepName: 'transfer',
    stepDetails: '',
    dropTip_location: 'fixedTrash',
  },
})
export const getMockMixStep = (): SavedStepFormState => ({
  mix_step_id: {
    id: 'mix_step_id',
    stepType: 'mix',
    stepName: 'mix',
    stepDetails: '',
    times: null,
    changeTip: 'always',
    labware: 'some_labware_id',
    mix_wellOrder_first: 't2b',
    mix_wellOrder_second: 'l2r',
    blowout_checkbox: false,
    blowout_location: 'fixedTrash',
    mix_mmFromBottom: 0.5,
    pipette: 'some_pipette_id',
    wells: ['A1'],
    volume: '100',
    aspirate_flowRate: null,
    dispense_flowRate: null,
    aspirate_delay_checkbox: false,
    aspirate_delay_seconds: '1',
    dispense_delay_checkbox: false,
    dispense_delay_seconds: '1',
    mix_touchTip_checkbox: false,
    mix_touchTip_mmFromTop: null,
    dropTip_location: 'fixedTrash',
  },
})
