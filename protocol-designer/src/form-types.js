// @flow
import type {IconName} from '@opentrons/components'
import type {ChangeTipOptions} from './step-generation'

export type StepIdType = string

export type StepFieldName =
  | 'aspirate_airGap_checkbox'
  | 'aspirate_airGap_volume'
  | 'aspirate_changeTip'
  | 'aspirate_disposalVol_checkbox'
  | 'aspirate_disposalVol_volume'
  | 'aspirate_flowRate'
  | 'aspirate_labware'
  | 'aspirate_mix_checkbox'
  | 'aspirate_mix_times'
  | 'aspirate_mix_volume'
  | 'aspirate_preWetTip'
  | 'aspirate_touchTip'
  | 'aspirate_touchTipMmFromBottom'
  | 'aspirate_mmFromBottom'
  | 'aspirate_wellOrder_first'
  | 'aspirate_wellOrder_second'
  | 'aspirate_wells'
  | 'changeTip'
  | 'dispense_blowout_checkbox'
  | 'dispense_blowout_location'
  | 'dispense_flowRate'
  | 'dispense_labware'
  | 'dispense_touchTip'
  | 'dispense_mix_checkbox'
  | 'dispense_mix_times'
  | 'dispense_mix_volume'
  | 'dispense_touchTipMmFromBottom'
  | 'dispense_mmFromBottom'
  | 'dispense_wellOrder_first'
  | 'dispense_wellOrder_second'
  | 'dispense_wells'
  | 'labware'
  | 'labwareLocationUpdate'
  | 'pauseForAmountOfTime'
  | 'pauseHour'
  | 'pauseMessage'
  | 'pauseMinute'
  | 'pauseSecond'
  | 'pipette'
  | 'stepDetails'
  | 'stepName'
  | 'times'
  | 'mix_mmFromBottom'
  | 'mix_touchTipMmFromBottom'
  | 'touchTip'
  | 'volume'
  | 'wells'
  // deck setup form fields
  | 'labwareLocationUpdate'
  | 'pipetteLocationUpdate'

// TODO Ian 2018-01-16 factor out to some constants.js ?
export const stepIconsByType: {[string]: IconName} = {
  'transfer': 'ot-transfer',
  'distribute': 'ot-distribute',
  'consolidate': 'ot-consolidate',
  'mix': 'ot-mix',
  'pause': 'pause',
  'manualIntervention': 'pause', // TODO Ian 2018-12-13 pause icon for this is a placeholder
}

export type StepType = $Keys<typeof stepIconsByType>

// ===== Unprocessed form types =====

export type AnnotationFields = {|
  'stepName': string,
  'stepDetails': string,
|}

export type BlowoutFields = {|
  'dispense_blowout_checkbox'?: boolean,
  'dispense_blowout_location'?: string,
|}

export type ChangeTipFields = {|
  'aspirate_changeTip'?: ChangeTipOptions,
|}

export type TransferLikeStepType = 'transfer' | 'consolidate' | 'distribute'

export type TransferLikeForm = {|
  ...AnnotationFields,
  ...BlowoutFields,
  ...ChangeTipFields,

  stepType: TransferLikeStepType,
  id: StepIdType,

  'aspirate_labware'?: string,
  'aspirate_wells'?: Array<string>,
  'pipette'?: string,
  'aspirate_preWetTip'?: boolean,
  'aspirate_airGap_checkbox'?: boolean,
  'aspirate_airGap_volume'?: string,
  'aspirate_mix_checkbox'?: boolean,
  'aspirate_mix_volume'?: string,
  'aspirate_mix_times'?: string,
  'aspirate_disposalVol_checkbox'?: boolean,
  'aspirate_disposalVol_volume'?: string,

  'volume'?: string,
  'dispense_labware'?: string,
  'dispense_wells'?: Array<string>,
  'dispense_touchTip'?: boolean,
  'dispense_mix_checkbox'?: boolean,
  'dispense_mix_volume'?: string,
  'dispense_mix_times'?: string,
|}

export type MixForm = {|
  ...AnnotationFields,
  ...BlowoutFields,
  ...ChangeTipFields,
  stepType: 'mix',
  id: StepIdType,

  'labware'?: string,
  'pipette'?: string,
  'times'?: string,
  'volume'?: string,
  'wells'?: Array<string>,
  'touch-tip'?: boolean,
|}

export type PauseForm = {|
  ...AnnotationFields,
  stepType: 'pause',
  id: StepIdType,

  'pauseForAmountOfTime'?: 'true' | 'false',
  'pauseHour'?: string,
  'pauseMinute'?: string,
  'pauseSecond'?: string,
  'pauseMessage'?: string,
|}

// TODO: separate field values from from metadata
export type FormData = {
  stepType: StepType,
  id: StepIdType,
  [StepFieldName]: any, // TODO: form value processing to ensure type
}
//  | MixForm
//  | PauseForm
//  | TransferLikeForm

export type PathOption = 'single' | 'multiAspirate' | 'multiDispense'

export type WellOrderOption = 'l2r' | 'r2l' | 't2b' | 'b2t'

export type BlankForm = {
  ...AnnotationFields,
  stepType: StepType,
  id: StepIdType,
}

// fields used in TipPositionInput
export type TipOffsetFields = 'aspirate_mmFromBottom'
  | 'dispense_mmFromBottom'
  | 'mix_mmFromBottom'
  | 'aspirate_touchTipMmFromBottom'
  | 'dispense_touchTipMmFromBottom'
  | 'mix_touchTipMmFromBottom'

export function getIsTouchTipField (fieldName: string): boolean {
  const touchTipFields = [
    'aspirate_touchTipMmFromBottom',
    'dispense_touchTipMmFromBottom',
    'mix_touchTipMmFromBottom',
  ]
  return touchTipFields.includes(fieldName)
}
