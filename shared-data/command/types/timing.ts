import type { CommonCommandRunTimeInfo, CommonCommandCreateInfo } from '.'

export type TimingCreateCommand =
  | WaitForResumeCreateCommand
  | WaitForDurationCreateCommand
  | DeprecatedDelayCreateCommand

export type TimingRunTimeCommand =
  | WaitForResumeRunTimeCommand
  | WaitForDurationRunTimeCommand
  | DeprecatedDelayRunTimeCommand

export interface WaitForResumeCreateCommand extends CommonCommandCreateInfo {
  // NOTE: `pause` accepted for backwards compatibility
  commandType: 'waitForResume' | 'pause'
  params: WaitForResumeParams
}

export interface WaitForResumeRunTimeCommand
  extends CommonCommandRunTimeInfo,
    WaitForResumeCreateCommand {
  result?: any
}

export interface WaitForResumeParams {
  message?: string
}

export interface WaitForDurationCreateCommand extends CommonCommandCreateInfo {
  commandType: 'waitForDuration'
  params: WaitForDurationParams
}

export interface WaitForDurationRunTimeCommand
  extends CommonCommandRunTimeInfo,
    WaitForDurationCreateCommand {
  result?: any
}

export interface WaitForDurationParams {
  seconds: number
  message?: string
}

export interface DeprecatedDelayCreateCommand extends CommonCommandCreateInfo {
  commandType: 'delay'
  params: DeprecatedDelayParams
}

export interface DeprecatedDelayRunTimeCommand
  extends CommonCommandRunTimeInfo,
    DeprecatedDelayCreateCommand {
  result?: {}
}

type DeprecatedDelayParams =
  | { waitForResume: true; message?: string }
  | { seconds: number; message?: string }
