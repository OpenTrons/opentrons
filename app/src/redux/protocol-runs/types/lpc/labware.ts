import type { LabwareOffset, StoredLabwareOffset } from '@opentrons/api-client'
import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
  OffsetLocationDetails,
} from './offsets'
import {
  OFFSETS_FROM_RUN_RECORD,
  OFFSETS_FROM_DATABASE,
  OFFSETS_CONFLICT,
  OFFSETS_SOURCE_INITIALIZING,
  OFFSETS_PENDING_SELECTION,
} from '/app/redux/protocol-runs'

export interface LPCLabwareInfo {
  // Whether the user has confirmed offsets should be applied to the run.
  // Initializes as true if the run has no LPC-able labware.
  areOffsetsApplied: boolean
  // From which source the offsets that populate LPCLabwareInfo are sourced.
  sourcedOffsets: OffsetSources
  // Offsets initially present on the run record immediately after LPC initialization.
  initialRunRecordOffsets: LabwareOffset[]
  // Run-relevant offsets initially stored on the robot-server immediately after LPC initialization.
  initialDatabaseOffsets: StoredLabwareOffset[]
  // Info related to differing offset vector values from the run record vs. database.
  conflictTimestampInfo: ConflictTimestampInfo
  selectedLabware: SelectedLwOverview | null
  labware: { [uri: string]: LwGeometryDetails }
}

export type OffsetSources =
  | typeof OFFSETS_FROM_RUN_RECORD
  | typeof OFFSETS_FROM_DATABASE
  | typeof OFFSETS_CONFLICT
  | typeof OFFSETS_SOURCE_INITIALIZING
  | typeof OFFSETS_PENDING_SELECTION

export interface ConflictTimestampInfo {
  isInitialized: boolean
  timestamp: string | null
}

export interface LwGeometryDetails {
  id: string
  displayName: string
  defaultOffsetDetails: DefaultOffsetDetails
  locationSpecificOffsetDetails: LocationSpecificOffsetDetails[]
}

export interface SelectedLwOverview {
  uri: string
  id: string
  offsetLocationDetails: OffsetLocationDetails | null
}
