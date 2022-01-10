import { CommonCommandInfo, CommonCommandRunTimeInfo } from '.'
export type PipettingRunTimeCommand =
  | AspirateRunTimeCommand
  | DispenseRunTimeCommand
  | AspirateAirGapRunTimeCommand
  | DispenseAirGapRunTimeCommand
  | BlowoutRunTimeCommand
  | TouchTipRunTimeCommand
  | PickUpTipRunTimeCommand
  | DropTipRunTimeCommand
export type PipettingCreateCommand =
  | AspirateCreateCommand
  | DispenseCreateCommand
  | AspirateAirGapCreateCommand
  | DispenseAirGapCreateCommand
  | BlowoutCreateCommand
  | TouchTipCreateCommand
  | PickUpTipCreateCommand
  | DropTipCreateCommand

export interface AspirateCreateCommand extends CommonCommandInfo {
  commandType: 'aspirate'
  params: AspDispAirgapParams
}
export interface AspirateRunTimeCommand
  extends CommonCommandRunTimeInfo,
    AspirateCreateCommand {
  result: BasicLiquidHandlingResult
}
export interface DispenseCreateCommand extends CommonCommandInfo {
  commandType: 'dispense'
  params: AspDispAirgapParams
}
export interface DispenseRunTimeCommand
  extends CommonCommandRunTimeInfo,
    DispenseCreateCommand {
  result: BasicLiquidHandlingResult
}
export interface AspirateAirGapCreateCommand extends CommonCommandInfo {
  commandType: 'aspirateAirGap'
  params: AspDispAirgapParams
}
export interface AspirateAirGapRunTimeCommand
  extends CommonCommandRunTimeInfo,
    AspirateAirGapCreateCommand {
  result: BasicLiquidHandlingResult
}
export interface DispenseAirGapCreateCommand extends CommonCommandInfo {
  commandType: 'dispenseAirGap'
  params: AspDispAirgapParams
}
export interface DispenseAirGapRunTimeCommand
  extends CommonCommandRunTimeInfo,
    DispenseAirGapCreateCommand {
  result: BasicLiquidHandlingResult
}
export interface BlowoutCreateCommand extends CommonCommandInfo {
  commandType: 'blowout'
  params: BlowoutParams
}
export interface BlowoutRunTimeCommand
  extends CommonCommandRunTimeInfo,
    BlowoutCreateCommand {
  result: BasicLiquidHandlingResult
}
export interface TouchTipCreateCommand extends CommonCommandInfo {
  commandType: 'touchTip'
  params: TouchTipParams
}
export interface TouchTipRunTimeCommand
  extends CommonCommandRunTimeInfo,
    TouchTipCreateCommand {
  result: BasicLiquidHandlingResult
}
export interface PickUpTipCreateCommand extends CommonCommandInfo {
  commandType: 'pickUpTip'
  params: PipetteAccessParams & WellLocationParam
}
export interface PickUpTipRunTimeCommand
  extends CommonCommandRunTimeInfo,
    PickUpTipCreateCommand {
  result: any
}
export interface DropTipCreateCommand extends CommonCommandInfo {
  commandType: 'dropTip'
  params: PipetteAccessParams & WellLocationParam
}
export interface DropTipRunTimeCommand
  extends CommonCommandRunTimeInfo,
    DropTipCreateCommand {
  result: any
}

type AspDispAirgapParams = FlowRateParams &
  PipetteAccessParams &
  VolumeParams &
  WellLocationParam
type BlowoutParams = FlowRateParams & PipetteAccessParams & WellLocationParam
type TouchTipParams = PipetteAccessParams & WellLocationParam

interface FlowRateParams {
  flowRate: number // µL/s
}

interface PipetteAccessParams {
  pipetteId: string
  labwareId: string
  wellName: string
}

interface VolumeParams {
  volume: number // µL
}

interface WellLocationParam {
  wellLocation?: {
    // default value is 'top'
    origin?: 'top' | 'bottom'
    offset?: {
      // mm
      // all values default to 0
      x?: number
      y?: number
      z?: number
    }
  }
}

interface BasicLiquidHandlingResult {
  volume: number // Amount of liquid in uL handled in the operation
}
