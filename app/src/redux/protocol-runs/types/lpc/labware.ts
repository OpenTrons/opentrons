import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
  OffsetLocationDetails,
} from './offsets'
import type {
  OFFSETS_FROM_RUN_RECORD,
  OFFSETS_FROM_DATABASE,
  OFFSETS_CONFLICT,
} from '/app/redux/protocol-runs'

export interface LPCLabwareInfo {
  // Whether the user has confirmed offsets should be applied to the run.
  // Initializes as true if the run has no LPC-able labware.
  areOffsetsApplied: boolean
  // From which source the offsets that populate LPCLabwareInfo are sourced.
  sourcedOffsets: OffsetSources
  // If current run offsets are stale, the run timestamp when they were not stale.
  lastFreshOffsetRunTimestamp: string | null
  selectedLabware: SelectedLwOverview | null
  labware: { [uri: string]: LwGeometryDetails }
}

export type OffsetSources =
  | typeof OFFSETS_FROM_RUN_RECORD
  | typeof OFFSETS_FROM_DATABASE
  | typeof OFFSETS_CONFLICT

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
