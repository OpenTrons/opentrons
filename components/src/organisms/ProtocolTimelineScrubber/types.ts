import type { CompletedProtocolAnalysis } from '@opentrons/shared-data'

export type CommandTextData = Pick<
  CompletedProtocolAnalysis,
  'pipettes' | 'labware' | 'modules' | 'liquids' | 'commands'
>
