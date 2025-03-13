import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
  OffsetLocationDetails,
} from './offsets'

export interface LPCLabwareInfo {
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
