import type { Selector } from 'reselect'
import { createSelector } from 'reselect'

import {
  getDefaultOffsetDetailsForAllLabware,
  getLocationSpecificOffsetDetailsForAllLabware,
  getMissingOffsets,
  getSelectedLabwareWithOffsetDetails,
  getWorkingOffsetsByUri,
} from '../transforms'

import {
  findDefaultOffsetWithFallbacks,
  findLocationSpecificOffsetWithFallbacks,
  getMostRecentVectorFrom,
} from '/app/redux/protocol-runs/utils'
import {
  OFFSET_KIND_DEFAULT,
  OFFSET_KIND_LOCATION_SPECIFIC,
  RESET_TO_DEFAULT,
} from '/app/redux/protocol-runs/constants'

import type {
  StoredLabwareOffsetCreate,
  VectorOffset,
} from '@opentrons/api-client'
import type { State } from '/app/redux/types'
import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
  LPCOffsetKind,
  WorkingOffset,
} from '/app/redux/protocol-runs'
import type { MissingOffsets, WorkingOffsetsByUri } from '../transforms'

// Get the location specific offset details for the currently user-selected labware geometry.
export const selectSelectedLwLocationSpecificOffsetDetails = (
  runId: string
): Selector<State, LocationSpecificOffsetDetails[]> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware?.uri,
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    (uri, lw) => {
      if (uri == null || lw == null) {
        console.warn('Failed to access labware details.')
        return []
      } else {
        return lw[uri].locationSpecificOffsetDetails ?? []
      }
    }
  )

// Get the default offset details for the currently user-selected labware geometry.
export const selectSelectedLwDefaultOffsetDetails = (
  runId: string
): Selector<State, DefaultOffsetDetails | null> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.selectedLabware?.uri,
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    (uri, lw) => {
      if (uri == null || lw == null) {
        console.warn('Failed to access labware details.')
        return null
      } else {
        return lw[uri].defaultOffsetDetails ?? null
      }
    }
  )

// Get the working offsets for the currently user-selected labware geometry with offset details.
export const selectSelectedLwWithOffsetDetailsWorkingOffsets = (
  runId: string
): Selector<State, WorkingOffset | null> =>
  createSelector(
    (state: State) => getSelectedLabwareWithOffsetDetails(runId, state),
    details => details?.workingOffset ?? null
  )

// Returns the most recent vector offset for the selected labware with offset details, if any.
// For location-specific offsets, if no location-specific offset is found, returns
// the default offset, if any.
export const selectSelectedLwWithOffsetDetailsMostRecentVectorOffset = (
  runId: string
): Selector<State, VectorOffset | null> =>
  createSelector(
    (state: State) => getSelectedLabwareWithOffsetDetails(runId, state),
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo,
    (details, info) => {
      if (details == null) {
        console.error('Expected to find labware info details but did not.')
        return null
      } else {
        const kind = details?.locationDetails.kind ?? OFFSET_KIND_DEFAULT
        const selectedLwUri = details?.locationDetails.definitionUri ?? ''
        const defaultOffsetDetails =
          info?.labware[selectedLwUri]?.defaultOffsetDetails ?? null

        if (kind === OFFSET_KIND_DEFAULT) {
          return findDefaultOffsetWithFallbacks(defaultOffsetDetails)
        } else if (kind === OFFSET_KIND_LOCATION_SPECIFIC) {
          return findLocationSpecificOffsetWithFallbacks(
            details as LocationSpecificOffsetDetails,
            defaultOffsetDetails
          )
        } else {
          return null
        }
      }
    }
  )

export interface MostRecentVectorOffsetForUriAndLocation {
  kind: LPCOffsetKind
  offset: VectorOffset
}

// Given a labware uri and offset details, returns the most recently configured offset, if any.
// For a location-specific offset, returns the most recent default offset if no location-specific
// offset exists.
export const selectMostRecentVectorOffsetForLwWithOffsetDetails = (
  runId: string,
  uri: string,
  offsetDetails: DefaultOffsetDetails | LocationSpecificOffsetDetails
): Selector<State, MostRecentVectorOffsetForUriAndLocation | null> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri],
    details => {
      if (details == null) {
        console.error('Expected to find labware info details but did not.')
        return null
      } else {
        const kind = offsetDetails.locationDetails.kind
        const { workingOffset, existingOffset } = offsetDetails

        if (kind === OFFSET_KIND_DEFAULT) {
          const mostRecentVector = getMostRecentVectorFrom(
            workingOffset,
            existingOffset
          )

          return mostRecentVector != null
            ? { kind: OFFSET_KIND_DEFAULT, offset: mostRecentVector }
            : null
        } else if (
          offsetDetails.locationDetails.kind === OFFSET_KIND_LOCATION_SPECIFIC
        ) {
          const mostRecentLSVector = getMostRecentVectorFrom(
            workingOffset,
            existingOffset
          )

          if (mostRecentLSVector != null) {
            return {
              kind: OFFSET_KIND_LOCATION_SPECIFIC,
              offset: mostRecentLSVector,
            }
          }
          // Get the default vector, if any.
          else {
            const {
              workingOffset: workingDefault,
              existingOffset: existingDefault,
            } = details.defaultOffsetDetails
            const defaultMostRecentVector = getMostRecentVectorFrom(
              workingDefault,
              existingDefault
            )

            return defaultMostRecentVector != null
              ? { kind: OFFSET_KIND_DEFAULT, offset: defaultMostRecentVector }
              : null
          }
        } else {
          return null
        }
      }
    }
  )

// NOTE: This count is analogous to the number of unique locations a labware geometry is utilized
// in a run.
export const selectCountLocationSpecificOffsetsForLw = (
  runId: string,
  uri: string
): Selector<State, number> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .locationSpecificOffsetDetails,
    locationSpecificDetails =>
      locationSpecificDetails != null ? locationSpecificDetails.length : 0
  )

// Whether the default offset is "absent" for the given labware geometry.
// The default offset only needs to be added client-side to be considered "not absent".
export const selectIsDefaultOffsetAbsent = (
  runId: string,
  uri: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .defaultOffsetDetails,
    details =>
      details?.existingOffset == null &&
      details?.workingOffset?.confirmedVector == null
  )

// Whether the default offset is "missing" for the given labware geometry.
// The default offset must be persisted on the robot-server to be considered "not missing".
export const selectIsDefaultOffsetMissing = (
  runId: string,
  uri: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .defaultOffsetDetails,
    details => details?.existingOffset == null
  )

export const selectWorkingOffsetsByUri = (
  runId: string
): Selector<State, WorkingOffsetsByUri> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labware => getWorkingOffsetsByUri(labware)
  )

// Returns the offset details for missing offsets, keyed by the labware URI.
// Note: only offsets persisted on the robot-server are "not missing".
export const selectMissingOffsets = (
  runId: string
): Selector<State, MissingOffsets> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labware => getMissingOffsets(labware)
  )

export interface SelectOffsetsToApplyResult {
  toUpdate: StoredLabwareOffsetCreate[]
  toDelete: string[] // existing offset ids
}

// Get all the offset data that requires server-side updating.
export const selectOffsetsToApply = (
  runId: string
): Selector<State, SelectOffsetsToApplyResult> =>
  createSelector(
    (state: State) =>
      getLocationSpecificOffsetDetailsForAllLabware(runId, state),
    (state: State) => getDefaultOffsetDetailsForAllLabware(runId, state),
    (allLSDetails, allDefaultDetails): SelectOffsetsToApplyResult => {
      const result: SelectOffsetsToApplyResult = { toUpdate: [], toDelete: [] }

      allLSDetails.forEach(detail => {
        if (detail.workingOffset?.confirmedVector != null) {
          const confirmedVector = detail.workingOffset.confirmedVector
          const { definitionUri, lwOffsetLocSeq } = detail.locationDetails

          if (confirmedVector === RESET_TO_DEFAULT) {
            const offsetId = detail.existingOffset?.id

            if (offsetId == null) {
              console.error(
                `Cannot delete offset. Expected id, got none for ${JSON.stringify(
                  detail
                )}`
              )
            } else {
              result.toDelete = [...result.toDelete, offsetId]
            }
          } else {
            result.toUpdate = [
              ...result.toUpdate,
              {
                definitionUri,
                locationSequence: lwOffsetLocSeq,
                vector: confirmedVector,
              },
            ]
          }
        }
      })

      // Note that we should never delete a default offset.
      allDefaultDetails.forEach(detail => {
        if (detail.workingOffset?.confirmedVector != null) {
          const confirmedVector = detail.workingOffset.confirmedVector
          const { definitionUri, lwOffsetLocSeq } = detail.locationDetails

          result.toUpdate = [
            ...result.toUpdate,
            {
              definitionUri,
              locationSequence: lwOffsetLocSeq,
              vector: confirmedVector,
            },
          ]
        }
      })

      return result
    }
  )
