import type { Mount } from '@opentrons/api-client'
import type {
  CutoutConfig,
  LabwareDefinition2,
  PipetteV2Specs,
} from '@opentrons/shared-data'
import type { ACTIONS, CONSOLIDATE, DISTRIBUTE, TRANSFER } from './constants'

export interface QuickTransferWizardState {
  pipette?: PipetteV2Specs
  mount?: Mount
  tipRack?: LabwareDefinition2
  source?: LabwareDefinition2
  sourceWells?: string[]
  destination?: LabwareDefinition2 | 'source'
  destinationWells?: string[]
  transferType?: TransferType
  volume?: number
}
export type PathOption = 'single' | 'multiAspirate' | 'multiDispense'
export type ChangeTipOptions =
  | 'always'
  | 'once'
  | 'never'
  | 'perDest'
  | 'perSource'
export type FlowRateKind = 'aspirate' | 'dispense' | 'blowout'
export type BlowOutLocation = 'source_well' | 'dest_well' | CutoutConfig

export interface QuickTransferSummaryState {
  pipette: PipetteV2Specs
  mount: Mount
  tipRack: LabwareDefinition2
  source: LabwareDefinition2
  sourceWells: string[]
  destination: LabwareDefinition2 | 'source'
  destinationWells: string[]
  transferType: TransferType
  volume: number
  aspirateFlowRate: number
  dispenseFlowRate: number
  path: PathOption
  tipPositionAspirate: number
  preWetTip: boolean
  mixOnAspirate?: {
    mixVolume: number
    repititions: number
  }
  delayAspirate?: {
    delayDuration: number
    positionFromBottom: number
  }
  touchTipAspirate?: number
  touchTipAspirateSpeed?: number
  airGapAspirate?: number
  tipPositionDispense: number
  mixOnDispense?: {
    mixVolume: number
    repititions: number
  }
  delayDispense?: {
    delayDuration: number
    positionFromBottom: number
  }
  touchTipDispense?: number
  touchTipDispenseSpeed?: number
  disposalVolume?: number
  blowOut?: BlowOutLocation
  airGapDispense?: number
  changeTip: ChangeTipOptions
  dropTipLocation: CutoutConfig
}

export type TransferType =
  | typeof CONSOLIDATE
  | typeof DISTRIBUTE
  | typeof TRANSFER

export type QuickTransferWizardAction =
  | SelectPipetteAction
  | SelectTipRackAction
  | SetSourceLabwareAction
  | SetSourceWellsAction
  | SetDestLabwareAction
  | SetDestWellsAction
  | SetVolumeAction

export type QuickTransferSummaryAction =
  | SetAspirateFlowRateAction
  | SetDispenseFlowRateAction
  | SetPipettePath
  | SetAspirateTipPosition
  | SetPreWetTip
  | SetMixOnAspirate
  | SetDelayAspirate
  | SetTouchTipAspirate
  | SetAirGapAspirate
  | SetDispenseTipPosition
  | SetMixOnDispense
  | SetDelayDispense
  | SetTouchTipDispense
  | SetBlowOut
  | SetAirGapDispense
  | SetChangeTip
  | SetDropTipLocation

interface SetAspirateFlowRateAction {
  type: typeof ACTIONS.SET_ASPIRATE_FLOW_RATE
  rate: number
}
interface SetDispenseFlowRateAction {
  type: typeof ACTIONS.SET_DISPENSE_FLOW_RATE
  rate: number
}
interface SetPipettePath {
  type: typeof ACTIONS.SET_PIPETTE_PATH
  path: PathOption
  disposalVolume?: number
  blowOutLocation?: BlowOutLocation
}
interface SetAspirateTipPosition {
  type: typeof ACTIONS.SET_ASPIRATE_TIP_POSITION
  position: number
}
interface SetPreWetTip {
  type: typeof ACTIONS.SET_PRE_WET_TIP
  preWetTip: boolean
}
interface SetMixOnAspirate {
  type: typeof ACTIONS.SET_MIX_ON_ASPIRATE
  mixSettings?: { mixVolume: number; repititions: number }
}
interface SetDelayAspirate {
  type: typeof ACTIONS.SET_DELAY_ASPIRATE
  delaySettings?: {
    delayDuration: number
    positionFromBottom: number
  }
}
interface SetTouchTipAspirate {
  type: typeof ACTIONS.SET_TOUCH_TIP_ASPIRATE
  position?: number
}
interface SetAirGapAspirate {
  type: typeof ACTIONS.SET_AIR_GAP_ASPIRATE
  volume?: number
}
interface SetDispenseTipPosition {
  type: typeof ACTIONS.SET_DISPENSE_TIP_POSITION
  position: number
}
interface SetMixOnDispense {
  type: typeof ACTIONS.SET_MIX_ON_DISPENSE
  mixSettings?: { mixVolume: number; repititions: number }
}
interface SetDelayDispense {
  type: typeof ACTIONS.SET_DELAY_DISPENSE
  delaySettings?: {
    delayDuration: number
    positionFromBottom: number
  }
}
interface SetTouchTipDispense {
  type: typeof ACTIONS.SET_TOUCH_TIP_DISPENSE
  position?: number
}
interface SetBlowOut {
  type: typeof ACTIONS.SET_BLOW_OUT
  location?: BlowOutLocation
}
interface SetAirGapDispense {
  type: typeof ACTIONS.SET_AIR_GAP_DISPENSE
  volume?: number
}
interface SetChangeTip {
  type: typeof ACTIONS.SET_CHANGE_TIP
  changeTip: ChangeTipOptions
}
interface SetDropTipLocation {
  type: typeof ACTIONS.SET_DROP_TIP_LOCATION
  location: CutoutConfig
}
interface SelectPipetteAction {
  type: typeof ACTIONS.SELECT_PIPETTE
  mount: Mount
  pipette: PipetteV2Specs
}
interface SelectTipRackAction {
  type: typeof ACTIONS.SELECT_TIP_RACK
  tipRack: LabwareDefinition2
}
interface SetSourceLabwareAction {
  type: typeof ACTIONS.SET_SOURCE_LABWARE
  labware: LabwareDefinition2
}
interface SetSourceWellsAction {
  type: typeof ACTIONS.SET_SOURCE_WELLS
  wells: string[]
}
interface SetDestLabwareAction {
  type: typeof ACTIONS.SET_DEST_LABWARE
  labware: LabwareDefinition2 | 'source'
}
interface SetDestWellsAction {
  type: typeof ACTIONS.SET_DEST_WELLS
  wells: string[]
}
interface SetVolumeAction {
  type: typeof ACTIONS.SET_VOLUME
  volume: number
}
