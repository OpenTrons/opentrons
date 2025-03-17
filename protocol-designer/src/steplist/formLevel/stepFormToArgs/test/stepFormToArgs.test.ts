import { describe, it, expect } from 'vitest'
import { _castForm } from '../index'
import type { LabwareEntity, PipetteEntity } from '@opentrons/step-generation'
import type {
  HydratedMagnetFormData,
  HydratedMixFormData,
  HydratedMoveLiquidFormData,
  HydratedPauseFormData,
  HydratedTemperatureFormData,
  HydratedThermocyclerFormData,
} from '../../../../form-types'

describe('form casting', () => {
  it('should cast moveLiquid form fields', () => {
    const input: HydratedMoveLiquidFormData = {
      id: 'stepId',
      stepType: 'moveLiquid',
      stepName: 'transfer',
      stepDetails: 'some details',
      aspirate_airGap_checkbox: false,
      aspirate_airGap_volume: 1,
      aspirate_delay_checkbox: false,
      aspirate_delay_mmFromBottom: 1,
      aspirate_delay_seconds: 1,
      aspirate_flowRate: 50,
      aspirate_labware: {} as LabwareEntity,
      aspirate_mix_checkbox: false,
      aspirate_mix_times: 0,
      aspirate_mix_volume: 0,
      aspirate_mmFromBottom: 1,
      aspirate_touchTip_checkbox: false,
      aspirate_wellOrder_first: 't2b',
      aspirate_wellOrder_second: 'l2r',
      aspirate_wells_grouped: false,
      aspirate_wells: ['A1'],
      blowout_checkbox: false,
      blowout_location: 'fixedTrash',
      changeTip: 'always',
      dispense_delay_checkbox: false,
      dispense_delay_mmFromBottom: 0.5,
      dispense_delay_seconds: 1,
      dispense_flowRate: null,
      dispense_labware: {} as LabwareEntity,
      dispense_mix_checkbox: false,
      dispense_mix_times: 0,
      dispense_mix_volume: 0,
      dispense_mmFromBottom: 0.5,
      dispense_touchTip_checkbox: false,
      dispense_wellOrder_first: 't2b',
      dispense_wellOrder_second: 'l2r',
      dispense_wells: ['A1'],
      disposalVolume_checkbox: true,
      disposalVolume_volume: 1,
      path: 'single',
      pipette: {} as PipetteEntity,
      preWetTip: false,
      volume: 5,
      dispense_airGap_checkbox: false,
      dropTip_location: 'some location',
      nozzles: null,
      tipRack: 'some tiprack',
      liquidClassesSupported: true,
    }
    expect(_castForm(input)).toEqual({
      ...input,
      aspirate_mix_times: 0,
      aspirate_mix_volume: 0,
      dispense_mix_times: 0,
      dispense_mix_volume: 0,
    })
  })

  it('should cast mix form fields', () => {
    const input: HydratedMixFormData = {
      id: 'stepId',
      stepType: 'mix',
      stepName: 'mix',
      stepDetails: '',
      changeTip: 'always',
      labware: {} as LabwareEntity,
      mix_wellOrder_first: 't2b',
      mix_wellOrder_second: 'l2r',
      blowout_checkbox: false,
      blowout_location: 'fixedTrash',
      mix_mmFromBottom: 0.5,
      pipette: {} as PipetteEntity,
      volume: 5,
      wells: ['A1', 'A2'],
      times: 2,
      aspirate_delay_checkbox: true,
      dispense_delay_checkbox: false,
      aspirate_delay_seconds: 2,
      dispense_delay_seconds: 1,
      dropTip_location: 'some location',
      mix_touchTip_checkbox: false,
      nozzles: null,
      tipRack: 'some tiprack',
      liquidClassesSupported: true,
    }

    expect(_castForm(input)).toEqual({
      ...input,
      mix_mmFromBottom: 0.5,
      volume: 5,
      times: 2,
      aspirate_delay_seconds: 2,
      dispense_delay_seconds: 1,
    })
  })

  it('should cast pause form fields', () => {
    const input: HydratedPauseFormData = {
      id: 'stepId',
      stepType: 'pause',
      stepName: 'pause',
      stepDetails: '',
      pauseAction: 'untilTime',
      pauseTime: '100',
      pauseMessage: 'some message',
      moduleId: 'someModuleId',
      pauseTemperature: '0',
    }

    // NOTE: pauseHour + pauseMinute + pauseSecond aren't cast to number
    expect(_castForm(input)).toEqual({
      ...input,
      pauseTemperature: 0,
    })
  })

  it('should cast magnet form fields', () => {
    const input: HydratedMagnetFormData = {
      id: 'stepId',
      stepType: 'magnet',
      stepName: 'magnet',
      stepDetails: '',
      moduleId: 'someModuleId',
      magnetAction: 'engage',
      engageHeight: '12',
    }

    expect(_castForm(input)).toEqual({ ...input, engageHeight: 12 })
  })

  it('should cast temperature form fields', () => {
    const input: HydratedTemperatureFormData = {
      id: 'stepId',
      stepType: 'temperature',
      stepName: 'temperature',
      stepDetails: '',
      moduleId: 'someModuleId',
      setTemperature: 'true',
      targetTemperature: '24',
    }
    expect(_castForm(input)).toEqual({
      ...input,
      targetTemperature: 24,
    })
  })

  it('should cast thermocycler form fields', () => {
    const input: HydratedThermocyclerFormData = {
      id: 'stepId',
      stepType: 'thermocycler',
      stepName: 'thermocycler',
      stepDetails: '',
      thermocyclerFormType: 'thermocyclerState',
      moduleId: 'someModuleId',
      blockIsActive: true,
      blockTargetTemp: '24',
      lidIsActive: true,
      lidTargetTemp: '44',
      lidOpen: true,
      profileVolume: null,
      profileTargetLidTemp: null,
      orderedProfileItems: [],
      profileItemsById: {},
      blockIsActiveHold: false,
      blockTargetTempHold: null,
      lidIsActiveHold: false,
      lidTargetTempHold: null,
      lidOpenHold: false,
    }
    expect(_castForm(input)).toEqual({
      ...input,
      blockTargetTemp: 24,
      lidTargetTemp: 44,
      blockTargetTempHold: 0,
      lidTargetTempHold: 0,
    })
  })
})
