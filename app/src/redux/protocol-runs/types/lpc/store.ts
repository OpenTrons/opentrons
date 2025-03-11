import type {
  CompletedProtocolAnalysis,
  DeckConfiguration,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { LPC_STEP } from '/app/redux/protocol-runs'
import type { LPCLabwareInfo } from './labware'

export interface LPCWizardState {
  steps: StepInfo
  activePipetteId: string
  labwareInfo: LPCLabwareInfo
  protocolData: CompletedProtocolAnalysis
  labwareDefs: LabwareDefinition2[]
  deckConfig: DeckConfiguration
  protocolName: string
  maintenanceRunId: string
}

export interface StepInfo {
  currentStepIndex: number
  totalStepCount: number
  all: LPCStep[]
  /* The last step idx in the user's routing history - not necessarily the previous step idx. */
  lastStepIndices: number[] | null
  /* Certain steps utilize substeps. These substeps shouldn't impact state the same way as steps,
   * so they are treated differently. */
  currentSubstep: HandleLwSubstep | null
}

export type LPCStep = keyof typeof LPC_STEP

export type LPCFlowType = 'default' | 'location-specific'

export type LPCSubstep = HandleLwSubstep

export type HandleLwSubstep =
  | 'handle-lw/list'
  | 'handle-lw/details'
  | 'handle-lw/edit-offset/prepare-labware'
  | 'handle-lw/edit-offset/check-labware'
  | 'handle-lw/edit-offset/success'
