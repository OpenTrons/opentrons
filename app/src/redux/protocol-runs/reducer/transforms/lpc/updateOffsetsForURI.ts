import {
  createUpdatedWorkingDefaultOffset,
  createUpdatedWorkingLocationSpecificOffset,
  findMatchingLocationOffset,
  findLocationSpecificOffsetWithFallbacks,
  vectorEqualsDefault,
} from '../../../utils'
import {
  APPLY_WORKING_OFFSETS,
  CLEAR_WORKING_OFFSETS,
  OFFSET_KIND_DEFAULT,
  RESET_OFFSET_TO_DEFAULT,
  RESET_TO_DEFAULT,
} from '/app/redux/protocol-runs'

import type {
  ApplyWorkingOffsetsAction,
  ClearSelectedLabwareWorkingOffsetsAction,
  DefaultOffsetDetails,
  FinalPositionAction,
  InitialPositionAction,
  LwGeometryDetails,
  LocationSpecificOffsetDetails,
  LPCWizardState,
  ResetLocationSpecificOffsetToDefaultAction,
  LocationSpecificOffsetLocationDetails,
} from '../../../types'

type PositionAction = InitialPositionAction | FinalPositionAction
type ResetPositionAction = ResetLocationSpecificOffsetToDefaultAction

type UpdateOffsetsAction =
  | PositionAction
  | ResetPositionAction
  | ClearSelectedLabwareWorkingOffsetsAction
  | ApplyWorkingOffsetsAction

// Handle vector position updates, only updating the appropriate working/existing offsets.
export function updateOffsetsForURI(
  state: LPCWizardState,
  action: UpdateOffsetsAction
): LwGeometryDetails {
  if (action.type === APPLY_WORKING_OFFSETS) {
    return handleApplyWorkingOffsets(
      state.labwareInfo.labware[action.payload.labwareUri]
    )
  } else if (action.type === CLEAR_WORKING_OFFSETS) {
    return handleClearWorkingOffsets(
      state.labwareInfo.labware[action.payload.labwareUri]
    )
  }
  // Handle remaining update offset actions.
  else {
    const { labwareUri, location } = action.payload
    const lwDetails = state.labwareInfo.labware[labwareUri]

    // Handle default offsets
    if (location.kind === OFFSET_KIND_DEFAULT) {
      return {
        ...lwDetails,
        defaultOffsetDetails: updateDefaultOffsetDetails(
          action as PositionAction,
          lwDetails.defaultOffsetDetails
        ),
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

// Apply any working offsets to make them the new existing offsets.
function handleApplyWorkingOffsets(
  lwDetails: LwGeometryDetails
): LwGeometryDetails {
  // Process location-specific offsets
  const updatedLSOffsetDetails = lwDetails.locationSpecificOffsetDetails.map(
    offset => {
      if (offset.workingOffset?.confirmedVector != null) {
        if (offset.workingOffset.confirmedVector === RESET_TO_DEFAULT) {
          // Delete the location-specific offset.
          return { ...offset, workingOffset: null, existingOffset: null }
        }
        // Apply confirmed vector as new existing offset
        else {
          return {
            ...offset,
            workingOffset: null,
            existingOffset: {
              vector: offset.workingOffset.confirmedVector,
              // TODO(jh, 03-07-25): Use the server response preferably.
              createdAt: new Date().getTime().toString(),
            },
          }
        }
      } else {
        return offset
      }
    }
  )

  // Process default offset
  const updatedDefaultOffsetDetails: DefaultOffsetDetails =
    lwDetails.defaultOffsetDetails.workingOffset?.confirmedVector != null
      ? {
          ...lwDetails.defaultOffsetDetails,
          workingOffset: null,
          existingOffset: {
            vector:
              lwDetails.defaultOffsetDetails.workingOffset.confirmedVector,
            createdAt: new Date().getTime().toString(),
          },
        }
      : { ...lwDetails.defaultOffsetDetails }

  return {
    ...lwDetails,
    defaultOffsetDetails: updatedDefaultOffsetDetails,
    locationSpecificOffsetDetails: updatedLSOffsetDetails,
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
        // Get the appropriate existing vector.
        const mostValidVector = findLocationSpecificOffsetWithFallbacks(
          relevantDetail,
          lwDetails.defaultOffsetDetails
        )

        // Create updated working offset
        const newWorkingDetail = createUpdatedWorkingLocationSpecificOffset(
          type,
          position,
          relevantDetail?.workingOffset ?? null,
          mostValidVector
        )

        // Get current default vector for comparison
        const currentDefaultVector =
          lwDetails.defaultOffsetDetails.workingOffset?.confirmedVector ??
          lwDetails.defaultOffsetDetails.existingOffset?.vector ??
          null

        if (
          vectorEqualsDefault(
            newWorkingDetail.confirmedVector,
            currentDefaultVector
          )
        ) {
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
