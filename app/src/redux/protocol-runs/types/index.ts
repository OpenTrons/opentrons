import type { RunSetupStatus, RunSetupStepsAction } from './setup'
import type { LPCWizardAction, LPCWizardState } from './lpc'

export * from './setup'
export * from './lpc'

export interface PerRunUIState {
  setup: RunSetupStatus
  lpc?: LPCWizardState
}

export interface ProtocolRunState {
  readonly [runId: string]: PerRunUIState
}

export type ProtocolRunAction = RunSetupStepsAction | LPCWizardAction
