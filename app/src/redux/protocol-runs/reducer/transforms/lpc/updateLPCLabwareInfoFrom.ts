import type { LabwareOffset } from '@opentrons/api-client'
import type { LPCLabwareInfo } from '/app/redux/protocol-runs'
import isEqual from 'lodash/isEqual'

// Given run record offsets, update the LPC store with those supplied vectors details.
// All run record supplied offsets will either match location-specific offsets or default offsets
// supplied by the database.
//
// The database provided offsets are injected at LPC store initialization.
//
// Note that hardcoded offsets are injected into the store on initialization too,
// and these will never need updating, as they are never supplied by the run record.
export function updateLPCLabwareInfoFrom(
  clonedRunOffsets: LabwareOffset[],
  currentLwInfoLw: LPCLabwareInfo['labware']
): LPCLabwareInfo['labware'] {
  if (clonedRunOffsets.length === 0) {
    console.error('Attempted to update LPC with no run offsets.')
    return currentLwInfoLw
  }

  return clonedRunOffsets.reduce(
    (acc, clonedRunOffset) => {
      const definitionUri = clonedRunOffset.definitionUri
      const lwInfo = acc[definitionUri]

      if (clonedRunOffset.locationSequence == null || lwInfo == null) {
        console.error(
          'Expected cloned run offset to have location sequence, but did not.'
        )
        return acc
      }

      const { locationSpecificOffsetDetails, defaultOffsetDetails } = lwInfo
      const { vector: defaultVector } = defaultOffsetDetails.existingOffset ?? {
        vector: null,
      }

      // Whether the cloned run offset location matches a location-specific offset location
      // in the LPC store keyed at the same labware URI.
      const relevantLSIdx = locationSpecificOffsetDetails.findLastIndex(
        lsStoreOffset =>
          isEqual(
            lsStoreOffset.locationDetails.lwOffsetLocSeq,
            clonedRunOffset.locationSequence
          )
      )

      // Matching location-specific offset case.
      if (relevantLSIdx > -1) {
        const newLocationSpecificOffsetDetails = locationSpecificOffsetDetails.map(
          (detail, idx) => {
            if (idx === relevantLSIdx) {
              return {
                ...detail,
                existingOffset: {
                  ...clonedRunOffset,
                },
              }
            }
            return detail
          }
        )

        return {
          ...acc,
          [definitionUri]: {
            ...lwInfo,
            locationSpecificOffsetDetails: newLocationSpecificOffsetDetails,
          },
        }
      }
      // Matching default offset case.
      // Whether the cloned run offset matches the default offset keyed
      // at the same labware URI.
      else if (
        defaultVector != null &&
        isEqual(defaultVector, clonedRunOffset.vector)
      ) {
        // Return updated state with new default offset
        return {
          ...acc,
          [definitionUri]: {
            ...lwInfo,
            defaultOffsetDetails: {
              ...defaultOffsetDetails,
              existingOffset: { ...clonedRunOffset },
            },
          },
        }
      }

      return acc
    },
    { ...currentLwInfoLw }
  )
}
