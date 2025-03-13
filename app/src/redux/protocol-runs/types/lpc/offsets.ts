import type { VectorOffset } from '@opentrons/api-client'
import type { ModuleModel } from '@opentrons/shared-data'

export type LPCOffsetKind = 'default' | 'location-specific' | 'hardcoded'

export interface LocationSpecificOffsetDetails extends BaseOffsetDetails {
  locationDetails: LocationSpecificOffsetLocationDetails
  workingOffset: WorkingLocationSpecificOffset | null
}

export interface DefaultOffsetDetails extends BaseOffsetDetails {
  locationDetails: DefaultOffsetLocationDetails
  workingOffset: WorkingDefaultOffset | null
}

interface BaseOffsetDetails {
  existingOffset: ExistingOffset | null
  workingOffset: WorkingOffset | null
  locationDetails: OffsetLocationDetails
}

export interface ExistingOffset {
  createdAt: string
  vector: VectorOffset
}

/* An offset locally configured but not yet sent to the server. */
export type WorkingOffset = WorkingDefaultOffset | WorkingLocationSpecificOffset

export interface WorkingDefaultOffset extends WorkingBaseOffset {
  confirmedVector: VectorOffset | null
}

export interface WorkingLocationSpecificOffset extends WorkingBaseOffset {}

interface WorkingBaseOffset {
  initialPosition: VectorOffset | null
  finalPosition: VectorOffset | null
  confirmedVector: VectorOffset | 'RESET_TO_DEFAULT' | null
}

export type OffsetLocationDetails =
  | DefaultOffsetLocationDetails
  | LocationSpecificOffsetLocationDetails

export interface DefaultOffsetLocationDetails
  extends BaseOffsetLocationDetails {
  slotName: 'C2'
  kind: 'default'
}

export interface LocationSpecificOffsetLocationDetails
  extends BaseOffsetLocationDetails {
  slotName: string
  kind: 'location-specific'
}

interface BaseOffsetLocationDetails {
  kind: LPCOffsetKind
  labwareId: string
  definitionUri: string
  moduleModel?: ModuleModel
  moduleId?: string
  adapterId?: string
}
