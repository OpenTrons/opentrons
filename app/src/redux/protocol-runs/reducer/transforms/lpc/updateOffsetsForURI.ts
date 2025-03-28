import {
  createUpdatedWorkingDefaultOffset,
  createUpdatedWorkingLocationSpecificOffset,
  findLocationSpecificOffsetWithFallbacks,
  findMatchingLocationOffset,
  vectorEqualsDefault,
} from '../../../utils'
import {
  CLEAR_WORKING_OFFSETS,
  OFFSET_KIND_DEFAULT,
  RESET_OFFSET_TO_DEFAULT,
  RESET_TO_DEFAULT,
  SET_FINAL_POSITION,
} from '/app/redux/protocol-runs'

import type {
  ClearSelectedLabwareWorkingOffsetsAction,
  DefaultOffsetDetails,
  FinalPositionAction,
  InitialPositionAction,
  LocationSpecificOffsetDetails,
  LocationSpecificOffsetLocationDetails,
  LPCWizardState,
  LwGeometryDetails,
  ResetLocationSpecificOffsetToDefaultAction,
} from '../../../types'

type PositionAction = InitialPositionAction | FinalPositionAction
type ResetPositionAction = ResetLocationSpecificOffsetToDefaultAction

type UpdateOffsetsAction =
  | PositionAction
  | ResetPositionAction
  | ClearSelectedLabwareWorkingOffsetsAction

// Handle vector position updates, only updating the appropriate working/existing offsets.
export function updateOffsetsForURI(
  state: LPCWizardState,
  action: UpdateOffsetsAction
): LwGeometryDetails {
  if (action.type === CLEAR_WORKING_OFFSETS) {
    return handleClearWorkingOffsets(
      state.labwareInfo.labware[action.payload.labwareUri]
    )
  }
  // Handle remaining update offset actions.
  else {
    const { labwareUri, location } = action.payload
    const lwDetails = state.labwareInfo.labware[labwareUri]

    // Handle default offsets.
    if (location.kind === OFFSET_KIND_DEFAULT) {
      const updatedDefaultOffsetDetails = updateDefaultOffsetDetails(
        action as PositionAction,
        lwDetails.defaultOffsetDetails
      )

      // Update location-specific offsets if they match the new default offset.
      const updatedLocationSpecificOffsetDetails =
        action.type === SET_FINAL_POSITION
          ? updateLocationSpecificDetailsBasedOnDefault(
              lwDetails.locationSpecificOffsetDetails,
              updatedDefaultOffsetDetails
            )
          : lwDetails.locationSpecificOffsetDetails

      return {
        ...lwDetails,
        defaultOffsetDetails: updatedDefaultOffsetDetails,
        locationSpecificOffsetDetails: updatedLocationSpecificOffsetDetails,
      }
    } else {
      // Handle location-specific offsets
      return {
        ...lwDetails,
        locationSpecificOffsetDetails: updateLocationSpecificOffsetDetails(
          action,
          lwDetails
        ),
      }
    }
  }
}

// Clear all working offsets.
function handleClearWorkingOffsets(
  lwDetails: LwGeometryDetails
): LwGeometryDetails {
  // Clear location-specific working offsets
  const updatedLSOffsetDetails = lwDetails.locationSpecificOffsetDetails.map(
    offset => ({ ...offset, workingOffset: null })
  )

  return {
    ...lwDetails,
    locationSpecificOffsetDetails: updatedLSOffsetDetails,
    // Clear default working offset
    defaultOffsetDetails: {
      ...lwDetails.defaultOffsetDetails,
      workingOffset: null,
    },
  }
}

// Update the default offset based on position changes.
function updateDefaultOffsetDetails(
  action: PositionAction,
  defaultOffsetDetails: DefaultOffsetDetails
): DefaultOffsetDetails {
  const { type, payload } = action
  const { position } = payload

  const existingVector = defaultOffsetDetails.existingOffset?.vector ?? null

  const newWorkingDetail = createUpdatedWorkingDefaultOffset(
    type,
    position,
    defaultOffsetDetails.workingOffset,
    existingVector
  )

  return { ...defaultOffsetDetails, workingOffset: newWorkingDetail }
}

// Update location-specific offsets based on default offset changes
function updateLocationSpecificDetailsBasedOnDefault(
  locationSpecificOffsetDetails: LocationSpecificOffsetDetails[],
  defaultOffsetDetails: DefaultOffsetDetails
): LocationSpecificOffsetDetails[] {
  const defaultWorkingVector =
    defaultOffsetDetails.workingOffset?.confirmedVector

  // If there's no new default vector to compare against, no changes are needed.
  if (defaultWorkingVector == null) {
    return locationSpecificOffsetDetails
  } else {
    return locationSpecificOffsetDetails.map(offset => {
      // Check if location specific working offset confirmed vector matches the default.
      if (
        offset.workingOffset?.confirmedVector != null &&
        vectorEqualsDefault(
          offset.workingOffset.confirmedVector,
          defaultWorkingVector
        )
      ) {
        // Remove working offset if they're equal.
        return { ...offset, workingOffset: null }
      }
      // Check if existing offset matches the new default.
      else if (
        offset.existingOffset?.vector != null &&
        vectorEqualsDefault(offset.existingOffset.vector, defaultWorkingVector)
      ) {
        // Mark for reset if they match.
        return {
          ...offset,
          workingOffset: {
            initialPosition: offset.workingOffset?.initialPosition ?? null,
            finalPosition: offset.workingOffset?.finalPosition ?? null,
            confirmedVector: RESET_TO_DEFAULT,
          },
        }
      }
      // No changes needed for this offset
      else {
        return offset
      }
    })
  }
}

// Update location-specific offsets.
function updateLocationSpecificOffsetDetails(
  action: PositionAction | ResetPositionAction,
  lwDetails: LwGeometryDetails
): LocationSpecificOffsetDetails[] {
  const { type, payload } = action

  if (type === RESET_OFFSET_TO_DEFAULT) {
    return handleResetToDefault(payload.location, lwDetails)
  }
  // Handle initial/final position update cases.
  else {
    const { position, location } = payload
    const locationSpecificOffsetDetails =
      lwDetails.locationSpecificOffsetDetails

    // Find the matching location (the relevant location-specific offset details).
    const {
      index: relevantDetailsIdx,
      details: relevantDetail,
    } = findMatchingLocationOffset(locationSpecificOffsetDetails, location)

    if (relevantDetailsIdx < 0 || relevantDetail == null) {
      console.warn(`No matching location found for ${payload.labwareUri}`)
      return locationSpecificOffsetDetails
    } else {
      // Create array without the relevant offset
      const newOffsetDetails = [
        ...locationSpecificOffsetDetails.slice(0, relevantDetailsIdx),
        ...locationSpecificOffsetDetails.slice(relevantDetailsIdx + 1),
      ]

      // Safety check for unexpected reset
      if (relevantDetail?.workingOffset?.confirmedVector === RESET_TO_DEFAULT) {
        console.error(
          'Unexpected reset to default supplied when vector value expected.'
        )
        return locationSpecificOffsetDetails
      } else {
        // Get the most valid vector for the relevant location-specific offset.
        const mostValidVector = findLocationSpecificOffsetWithFallbacks(
          relevantDetail,
          lwDetails.defaultOffsetDetails
        )

        // Create updated working offset.
        const newWorkingDetail = createUpdatedWorkingLocationSpecificOffset(
          type,
          position,
          relevantDetail?.workingOffset ?? null,
          mostValidVector
        )

        // Get current default vector for comparison.
        const currentDefaultVector =
          lwDetails.defaultOffsetDetails.workingOffset?.confirmedVector ??
          lwDetails.defaultOffsetDetails.existingOffset?.vector ??
          null
        const newVectorEqualsDefaultVector =
          type === SET_FINAL_POSITION &&
          vectorEqualsDefault(
            newWorkingDetail.confirmedVector,
            currentDefaultVector
          )

        if (newVectorEqualsDefaultVector) {
          // If we have an existing offset, mark it for reset.
          if (relevantDetail?.existingOffset != null) {
            return [
              ...newOffsetDetails,
              {
                ...relevantDetail,
                workingOffset: {
                  ...newWorkingDetail,
                  confirmedVector: RESET_TO_DEFAULT,
                },
              },
            ]
          }
          // If there's no existing offset, just remove the working offset.
          else {
            return [
              ...newOffsetDetails,
              { ...relevantDetail, workingOffset: null },
            ]
          }
        }
        // Use the calculated vector.
        else {
          return [
            ...newOffsetDetails,
            { ...relevantDetail, workingOffset: newWorkingDetail },
          ]
        }
      }
    }
  }
}

// Handle the "reset to default" action for location-specific offsets.
function handleResetToDefault(
  location: LocationSpecificOffsetLocationDetails,
  lwDetails: LwGeometryDetails
): LocationSpecificOffsetDetails[] {
  const locationSpecificOffsetDetails = lwDetails.locationSpecificOffsetDetails

  // Find the relevant offset
  const {
    index: relevantDetailsIdx,
    details: relevantDetail,
  } = findMatchingLocationOffset(locationSpecificOffsetDetails, location)

  if (relevantDetailsIdx < 0 || relevantDetail == null) {
    console.warn(`No matching location found for reset operation`)
    return locationSpecificOffsetDetails
  } else {
    // Create array without the relevant offset
    const newOffsetDetails = [
      ...locationSpecificOffsetDetails.slice(0, relevantDetailsIdx),
      ...locationSpecificOffsetDetails.slice(relevantDetailsIdx + 1),
    ]

    // If the existing offset is null, we can just set the working back to null,
    // which avoids sending superfluous DELETE requests to the robot-server.
    const newRelevantDetail: LocationSpecificOffsetDetails = {
      ...relevantDetail,
      workingOffset:
        relevantDetail.existingOffset != null
          ? {
              initialPosition:
                relevantDetail.workingOffset?.initialPosition ?? null,
              finalPosition:
                relevantDetail.workingOffset?.finalPosition ?? null,
              confirmedVector: RESET_TO_DEFAULT,
            }
          : null,
    }

    return [...newOffsetDetails, newRelevantDetail]
  }
}
