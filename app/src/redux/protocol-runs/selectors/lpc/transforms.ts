import isEqual from 'lodash/isEqual'

import { getLabwareDefURI } from '@opentrons/shared-data'

import {
  OFFSET_KIND_DEFAULT,
  OFFSET_KIND_LOCATION_SPECIFIC,
} from '/app/redux/protocol-runs/constants'

import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { State } from '/app/redux/types'
import type {
  LwGeometryDetails,
  LocationSpecificOffsetDetails,
  LPCLabwareInfo,
  LocationSpecificOffsetLocationDetails,
  DefaultOffsetLocationDetails,
  WorkingOffset,
  LPCOffsetKind,
  DefaultOffsetDetails,
} from '/app/redux/protocol-runs'

export interface GetLabwareDefsForLPCParams {
  labwareId: string
  loadedLabware: CompletedProtocolAnalysis['labware']
  labwareDefs: LabwareDefinition2[]
}

export const getItemLabwareDef = ({
  labwareId,
  loadedLabware,
  labwareDefs,
}: GetLabwareDefsForLPCParams): LabwareDefinition2 | null => {
  const labwareDefUri =
    loadedLabware.find(l => l.id === labwareId)?.definitionUri ?? null

  if (labwareDefUri == null) {
    console.warn(`Null labware def found for labwareId: ${labwareId}`)
  }

  return (
    labwareDefs.find(def => getLabwareDefURI(def) === labwareDefUri) ?? null
  )
}

export const getSelectedLabwareWithOffsetDetails = (
  runId: string,
  state: State
): LocationSpecificOffsetDetails | DefaultOffsetDetails | null => {
  const selectedLabware =
    state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware
  const lwDetails =
    state.protocolRuns[runId]?.lpc?.labwareInfo.labware[
      selectedLabware?.uri ?? ''
    ]

  if (selectedLabware?.offsetLocationDetails?.kind === OFFSET_KIND_DEFAULT) {
    return lwDetails?.defaultOffsetDetails ?? null
  } else {
    const offsetDetails = lwDetails?.locationSpecificOffsetDetails

    return (
      offsetDetails?.find(offset =>
        isEqual(offset.locationDetails, selectedLabware?.offsetLocationDetails)
      ) ?? null
    )
  }
}

export const getSelectedLabwareDefFrom = (
  runId: string,
  state: State
): LabwareDefinition2 | null => {
  const selectedLabware =
    state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware
  const labwareDefs = state?.protocolRuns[runId]?.lpc?.labwareDefs
  const analysis = state?.protocolRuns[runId]?.lpc?.protocolData

  if (selectedLabware == null || labwareDefs == null || analysis == null) {
    console.warn('No selected labware or store not properly initialized.')
    return null
  } else {
    return getItemLabwareDef({
      labwareId: selectedLabware.id,
      labwareDefs,
      loadedLabware: analysis.labware,
    })
  }
}

export const getLocationSpecificOffsetDetailsForAllLabware = (
  runId: string,
  state: State
): LocationSpecificOffsetDetails[] => {
  const labware = state?.protocolRuns[runId]?.lpc?.labwareInfo.labware ?? {}

  return Object.values(labware).flatMap(
    (details: LwGeometryDetails) => details.locationSpecificOffsetDetails
  )
}

export const getDefaultOffsetDetailsForAllLabware = (
  runId: string,
  state: State
): DefaultOffsetDetails[] => {
  const labware = state?.protocolRuns[runId]?.lpc?.labwareInfo.labware ?? {}

  return Object.values(labware).map(
    (details: LwGeometryDetails) => details.defaultOffsetDetails
  )
}
type LabwareURI = string

export interface MisingDefaultOffsets {
  [uri: LabwareURI]: DefaultOffsetLocationDetails
}
export interface MissingLocationSpecificOffsets {
  [uri: LabwareURI]: LocationSpecificOffsetLocationDetails[]
}

export interface MissingOffsets {
  defaultOffsets: MisingDefaultOffsets
  locationSpecificOffsets: MissingLocationSpecificOffsets
}

// Derive missing offsets for every labware by checking to see if an "existing offset" value
// does not exist. Note: only offsets persisted on the robot-server are "not missing."
export const getMissingOffsets = (
  labware: LPCLabwareInfo['labware'] | undefined
): MissingOffsets => {
  const missingOffsets: MissingOffsets = {
    defaultOffsets: {},
    locationSpecificOffsets: {},
  }

  if (labware != null) {
    // Location specific missing offsets.
    Object.entries(labware).forEach(([uri, lwDetails]) => {
      lwDetails.locationSpecificOffsetDetails.forEach(detail => {
        const locationDetails = detail.locationDetails

        if (detail.existingOffset == null) {
          missingOffsets.locationSpecificOffsets[uri] =
            missingOffsets.locationSpecificOffsets[uri] != null
              ? [
                  ...missingOffsets.locationSpecificOffsets[uri],
                  locationDetails,
                ]
              : [locationDetails]
        }
      })

      // Default missing offsets.
      if (lwDetails.defaultOffsetDetails.existingOffset == null) {
        missingOffsets.defaultOffsets[uri] =
          lwDetails.defaultOffsetDetails.locationDetails
      }
    })
  }

  return missingOffsets
}

interface WorkingOffsetDetails {
  kind: Omit<LPCOffsetKind, 'hardcoded'>
  offset: WorkingOffset['confirmedVector']
}

export interface WorkingOffsetsByUri {
  [uri: string]: WorkingOffsetDetails[]
}

// Returns a list of working offsets by uri. An offset is "working" if the user
// has confirmed both an initial and final position vector, and the derived confirmed vector
// has not yet been reported to the robot-server.
export function getWorkingOffsetsByUri(
  labware: LPCLabwareInfo['labware'] | undefined
): WorkingOffsetsByUri {
  const workingOffsetsByUri: WorkingOffsetsByUri = {}

  if (labware != null) {
    Object.entries(labware).forEach(([uri, lwDetails]) => {
      const defaultOffset =
        lwDetails.defaultOffsetDetails.workingOffset?.confirmedVector

      // Add the default offset if it is a "working" case.
      if (defaultOffset != null) {
        const workingOffsetDetail: WorkingOffsetDetails = {
          kind: OFFSET_KIND_DEFAULT,
          offset: defaultOffset,
        }

        workingOffsetsByUri[uri] =
          workingOffsetsByUri[uri] != null
            ? [...workingOffsetsByUri[uri], workingOffsetDetail]
            : [workingOffsetDetail]
      }

      // Handle all location-specific offsets, adding any "working" offset cases.
      lwDetails.locationSpecificOffsetDetails.forEach(offsetDetail => {
        if (offsetDetail.workingOffset != null) {
          const workingOffsetDetail: WorkingOffsetDetails = {
            kind: OFFSET_KIND_LOCATION_SPECIFIC,
            offset: offsetDetail.workingOffset.confirmedVector,
          }
          workingOffsetsByUri[uri] =
            workingOffsetsByUri[uri] != null
              ? [...workingOffsetsByUri[uri], workingOffsetDetail]
              : [workingOffsetDetail]
        }
      })
    })
  }

  return workingOffsetsByUri
}

export function getAreAllOffsetsHardCoded(
  lsDetails: LocationSpecificOffsetDetails[] | undefined
): boolean {
  return (
    lsDetails?.every(
      detail => detail.locationDetails.hardCodedOffsetId != null
    ) ?? false
  )
}

export function getCountHardCodedOffsets(
  lsDetails: LocationSpecificOffsetDetails[] | undefined
): number {
  return lsDetails != null
    ? lsDetails.filter(
        detail => detail.locationDetails.hardCodedOffsetId != null
      ).length
    : 0
}
