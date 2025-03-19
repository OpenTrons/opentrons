import type { Run } from '@opentrons/api-client'

export interface OffsetsConflictModalProps {
  runId: string
  runRecord: Run | undefined
}
