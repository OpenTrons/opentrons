import type { VectorOffset } from '../runs'
import type { LabwareOffsetLocationSequenceComponent } from '../types'

export interface StoredLabwareOffset {
  id: string
  createdAt: string
  definitionUri: string
  locationSequence:
    | LabwareOffsetLocationSequenceComponent[]
    | typeof ANY_LOCATION
  vector: VectorOffset
}

export interface MultiBodyMeta {
  cursor: number
  totalLength: number
}

export const ANY_LOCATION = 'anyLocation' as const
