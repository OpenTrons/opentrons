import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
  OffsetLocationDetails,
} from './offsets'

export interface LPCLabwareInfo {
  // Whether the user has confirmed offsets should be applied to the run.
  // Initializes as true if the run has no LPC-able labware.
  areOffsetsApplied: boolean
  // If current run offsets are stale, the run timestamp when they were not stale.
  lastFreshOffsetRunTimestamp: string | null
  selectedLabware: SelectedLwOverview | null
  labware: { [uri: string]: LwGeometryDetails }
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
