import isEqual from 'lodash/isEqual'

import { ANY_LOCATION } from '@opentrons/api-client'

import type {
  ApplyWorkingOffsetsAction,
  LPCLabwareInfo,
  LPCWizardState,
} from '/app/redux/protocol-runs'

// Apply any working offsets to make them the new existing offsets.
export function handleApplyWorkingOffsets(
  state: LPCWizardState,
  action: ApplyWorkingOffsetsAction
): LPCLabwareInfo['labware'] {
  const { saveResult } = action.payload

  return Object.entries(state.labwareInfo.labware).reduce<
    LPCLabwareInfo['labware']
  >((acc, [definitionUri, details]) => {
    const updatedDetails = { ...details }

    // Find if this labware has any updates from the saveResult
    const updates = saveResult.filter(
      updatedLw => updatedLw.definitionUri === definitionUri
    )

    // If no updates for this labware, just keep it as is.
    if (updates.length === 0) {
      acc[definitionUri] = updatedDetails
      return acc
    }

    // Else, process updates for this labware.
    updates.forEach(updatedLw => {
      const { vector, id, createdAt, locationSequence } = updatedLw

      // Process default offset.
      if (updatedLw.locationSequence === ANY_LOCATION) {
        updatedDetails.defaultOffsetDetails = {
          ...updatedDetails.defaultOffsetDetails,
          workingOffset: null,
          existingOffset: { vector, id, createdAt },
          locationDetails: {
            ...updatedDetails.defaultOffsetDetails.locationDetails,
          },
        }
      }
      // Process location-specific offsets.
      else {
        const lsDetails = updatedDetails.locationSpecificOffsetDetails
        const matchIndex = lsDetails.findIndex(lsDetail =>
          isEqual(lsDetail.locationDetails.lwOffsetLocSeq, locationSequence)
        )

        if (matchIndex === -1) {
          console.error(
            'Expected to find matching location sequence for server-saved offset but did not.'
          )
        } else {
          const nonMatchingDetails = [
            ...lsDetails.slice(0, matchIndex),
            ...lsDetails.slice(matchIndex + 1),
          ]

          const updatedMatchingDetail = {
            ...lsDetails[matchIndex],
            workingOffset: null,
            existingOffset: { vector, id, createdAt },
          }

          updatedDetails.locationSpecificOffsetDetails = [
            ...nonMatchingDetails,
            updatedMatchingDetail,
          ]
        }
      }
    })

    acc[definitionUri] = updatedDetails
    return acc
  }, {})
}
