import { createSelector } from 'reselect'

import { getLabwareDisplayLocation } from '@opentrons/components'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  getAreAnyLocationSpecificOffsetsMissing,
  getAreAllOffsetsHardCoded,
  getCountHardCodedOffsets,
  getDefaultOffsetDetailsForAllLabware,
  getLocationSpecificOffsetDetailsForAllLabware,
  getMissingOffsets,
  getSelectedLabwareWithOffsetDetails,
  getWorkingOffsetsByUri,
  getTotalCountNonHardCodedLocationSpecificOffsets,
  getTotalCountLocationSpecificOffsets,
  getCountNonHardcodedLocationSpecificOffsets,
  getIsNecessaryDefaultOffsetMissing,
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
  LabwareOffsetCreateData,
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
import type { TFunction } from 'i18next'
import type { Selector } from 'reselect'

export const selectAreOffsetsApplied = (
  runId: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.areOffsetsApplied,
    areOffsetsApplied => areOffsetsApplied ?? false
  )

export interface LocationSpecificOffsetDetailsWithCopy
  extends LocationSpecificOffsetDetails {
  slotCopy: string
}

// Get the location specific offset details for the currently user-selected labware geometry.
export const selectSortedLSOffsetDetailsWithCopy = (
  runId: string,
  uri: string,
  t: TFunction
): Selector<State, LocationSpecificOffsetDetailsWithCopy[]> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    (state: State) => state.protocolRuns[runId]?.lpc?.protocolData,
    (labware, protocolData) => {
      if (labware == null || protocolData == null) {
        console.warn('Failed to access labware details.')
        return []
      } else {
        const lsDetails = labware[uri].locationSpecificOffsetDetails

        const lsDetailsWithCopy = lsDetails.map(offset => {
          const slotCopy = getLabwareDisplayLocation({
            t,
            loadedModules: protocolData.modules,
            loadedLabwares: protocolData.labware,
            robotType: FLEX_ROBOT_TYPE,
            location: {
              addressableAreaName: offset.locationDetails.addressableAreaName,
            },
            detailLevel: 'slot-only',
          }).slice(-2) // ex, "C1" instead of "Slot C1"

          return {
            ...offset,
            slotCopy,
          }
        })

        return [...lsDetailsWithCopy].sort((a, b) =>
          a.slotCopy.localeCompare(b.slotCopy, 'en', {
            numeric: true,
          })
        )
      }
    }
  )

export const selectTotalOrMissingOffsetCountForLwCopy = (
  runId: string,
  uri: string,
  t: TFunction
): Selector<State, string> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .defaultOffsetDetails,
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .locationSpecificOffsetDetails,
    (defaultDetails, lsDetails) => {
      const countLSOffsetsNoHC = getCountNonHardcodedLocationSpecificOffsets(
        lsDetails
      )
      const isNecessaryDefaultOffsetMising = getIsNecessaryDefaultOffsetMissing(
        defaultDetails,
        lsDetails
      )

      if (countLSOffsetsNoHC > 1) {
        return isNecessaryDefaultOffsetMising
          ? t('num_missing_offsets', { num: countLSOffsetsNoHC })
          : t('num_offsets', { num: countLSOffsetsNoHC })
      } else {
        return isNecessaryDefaultOffsetMising
          ? t('one_missing_offset')
          : t('one_offset')
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

// The total count of all location specific offsets utilized in a run.
export const selectTotalCountLocationSpecificOffsets = (
  runId: string
): Selector<State, number> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labware => getTotalCountLocationSpecificOffsets(labware)
  )

// Whether the default offset is "absent" for the given labware geometry.
// The default offset only needs to be added client-side to be considered "not absent".
// Note that the default offset is not considered absent if all locations that would
// utilize the default offset in the run are "hardcoded".
export const selectIsDefaultOffsetAbsent = (
  runId: string,
  uri: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .defaultOffsetDetails,
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .locationSpecificOffsetDetails,
    (defaultDetails, lsDetails) =>
      defaultDetails?.existingOffset == null &&
      defaultDetails?.workingOffset?.confirmedVector == null &&
      !getAreAllOffsetsHardCoded(lsDetails)
  )

// Whether the default offset is "missing" for the given labware geometry.
// The default offset must be persisted on the robot-server to be considered "not missing".
// Note that the default offset is not considered missing if all locations that would
// utilize the default offset in the run are "hardcoded" or have existing location-specific
// offsets.
export const selectIsNecessaryDefaultOffsetMissing = (
  runId: string,
  uri: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .defaultOffsetDetails,
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .locationSpecificOffsetDetails,
    (defaultDetails, lsDetails) =>
      getIsNecessaryDefaultOffsetMissing(defaultDetails, lsDetails)
  )

// Is any default offset missing for the run. See selectIsNecessaryDefaultOffsetMissing.
export const selectIsAnyNecessaryDefaultOffsetMissing = (
  runId: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labware => {
      if (labware == null) {
        return false
      }

      return Object.values(labware).some(details => {
        const {
          defaultOffsetDetails: defaultDetails,
          locationSpecificOffsetDetails: lsDetails,
        } = details

        return (
          defaultDetails.existingOffset == null &&
          !getAreAllOffsetsHardCoded(lsDetails) &&
          !getAreAnyLocationSpecificOffsetsMissing(lsDetails)
        )
      })
    }
  )

export const selectWorkingOffsetsByUri = (
  runId: string
): Selector<State, WorkingOffsetsByUri> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labware => getWorkingOffsetsByUri(labware)
  )

// Whether any offsets are "hardcoded" for the given labware geometry.
export const selectIsAnyOffsetHardCoded = (
  runId: string,
  uri: string
): Selector<State, boolean> =>
  createSelector(
    (state: State) =>
      state.protocolRuns[runId]?.lpc?.labwareInfo.labware[uri]
        .locationSpecificOffsetDetails,
    details =>
      details?.some(
        detail => detail.locationDetails.hardCodedOffsetId != null
      ) ?? false
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
export const selectPendingOffsetOperations = (
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

// Returns offsets for injection into the run. Prefer the location-specific
// offset if it exists, otherwise use the default offset. Locations with hardcoded
// offsets are ignored.
export const selectLabwareOffsetsToAddToRun = (
  runId: string
): Selector<State, LabwareOffsetCreateData[] | null> =>
  createSelector(
    (state: State) => state.protocolRuns[runId]?.lpc?.labwareInfo.labware,
    labware => {
      if (labware == null) {
        return []
      }

      try {
        const result: LabwareOffsetCreateData[] = []

        Object.entries(labware).forEach(([uri, details]) => {
          const {
            defaultOffsetDetails,
            locationSpecificOffsetDetails: lsDetails,
          } = details
          const defaultVector = defaultOffsetDetails.existingOffset?.vector

          lsDetails.forEach(detail => {
            const { vector: lsVector } = detail.existingOffset ?? {
              vector: null,
            }
            const locationSequence = detail.locationDetails.lwOffsetLocSeq

            if (detail.locationDetails.hardCodedOffsetId == null) {
              if (lsVector != null) {
                result.push({
                  definitionUri: uri,
                  vector: lsVector,
                  locationSequence,
                })
              } else if (defaultVector != null) {
                result.push({
                  definitionUri: uri,
                  vector: defaultVector,
                  locationSequence,
                })
              } else {
                console.error(
                  `CRITICAL ERROR: Expected to apply a default offset to the run, but did not for lw: ${uri}, details: ${JSON.stringify(
                    details
                  )}`
                )

                throw new Error('Missing required offset.')
              }
            }
          })
        })

        return result
      } catch (error) {
        return null
      }
    }
  )
