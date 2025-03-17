import type {
  ANY_LOCATION,
  LabwareOffsetLocationSequence,
  OnLabwareOffsetLocationSequenceComponent,
  OnModuleOffsetLocationSequenceComponent,
  VectorOffset,
} from '@opentrons/api-client'
import type {
  FlexAddressableAreaName,
  ModuleModel,
} from '@opentrons/shared-data'

export type LabwareOffsetLocSeqOrAnyLoc =
  | LabwareOffsetLocationSequence
  | typeof ANY_LOCATION

export interface ModStackupDetail {
  kind: 'module'
  moduleModel: ModuleModel
  id: string
}

export interface LabwareStackupDetail {
  kind: 'labware'
  labwareUri: string
  id: string
}

export type LabwareModuleStackupDetail = ModStackupDetail | LabwareStackupDetail

export type LabwareModuleStackupDetails = LabwareModuleStackupDetail[]

/** The location and labware info for a top-most labware in a stackup. This data is associated
 * with a labware that is LPC-able.
 *
 * In current LPC flows, the UI is greatly concerned with the closest module and
 * adapter beneath the labware of LPC interest. Therefore, much of the below data
 * are so frequently used in copy, deck maps, deck labels, etc., that it is reasonable to inject
 * these data as a part of the location info. */
export interface LabwareLocationInfo {
  // The definition URI of the top-most labware.
  definitionUri: string
  // A labware id in the run that is an instance of the labware geometry (the definitionUri).
  labwareId: string
  // The base slot in which the top-most labware resides.
  addressableAreaName: FlexAddressableAreaName
  // The actual offset location sequence used for querying or updating the offset related
  // to the labware location info.
  lwOffsetLocSeq: LabwareOffsetLocSeqOrAnyLoc
  // The module + labware stackup including the top-most labware (the labware being LPC'd).
  // LPC cares about real instances of these geometries for running commands, so the
  // id is included, too.
  // NOTE: Elements are sorted from the lowest item in the stack to the top-most.
  lwModOnlyStackupDetails: LabwareModuleStackupDetails
  // The id of the closest module that resides beneath the top-most labware, if any.
  closestBeneathModuleId?: string
  // The model of the closest module that resides beneath the top-most labware, if any.
  closestBeneathModuleModel?: ModuleModel
  // The id of the closest adapter that resides beneath the top-most labware, if any.
  closestBeneathAdapterId?: string
  // The offset id associated with labware.set_offset(), if any.
  hardCodedOffsetId?: string | null
}

export type LPCOffsetKind = 'default' | 'location-specific'

interface BaseOffsetLocationDetails extends LabwareLocationInfo {
  kind: LPCOffsetKind
}

export type OffsetLocationDetails =
  | DefaultOffsetLocationDetails
  | LocationSpecificOffsetLocationDetails

export interface DefaultOffsetLocationDetails
  extends BaseOffsetLocationDetails {
  addressableAreaName: 'C2'
  kind: 'default'
  lwOffsetLocSeq: typeof ANY_LOCATION
  hardCodedOffsetId?: undefined
}

export interface LocationSpecificOffsetLocationDetails
  extends BaseOffsetLocationDetails {
  addressableAreaName: FlexAddressableAreaName
  kind: 'location-specific'
  lwOffsetLocSeq: LabwareOffsetLocationSequence
  hardCodedOffsetId: string | null
}

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
  id: string
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
