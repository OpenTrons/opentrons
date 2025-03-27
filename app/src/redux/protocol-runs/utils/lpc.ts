import isEqual from 'lodash/isEqual'

import {
  getVectorDifference,
  getVectorSum,
  IDENTITY_VECTOR,
} from '@opentrons/shared-data'

import { RESET_TO_DEFAULT } from '../constants'

import type { VectorOffset } from '@opentrons/api-client'
import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
  WorkingOffset,
  ExistingOffset,
  WorkingDefaultOffset,
  WorkingLocationSpecificOffset,
  OffsetLocationDetails,
} from '../types'

// Returns the most recent vector offset from offset details.
export function getMostRecentVectorFrom(
  workingOffset: WorkingOffset | null,
  existingOffset: ExistingOffset | null
): VectorOffset | null {
  if (
    workingOffset?.confirmedVector != null &&
    workingOffset.confirmedVector !== RESET_TO_DEFAULT
  ) {
    return workingOffset.confirmedVector
  } else if (
    existingOffset?.vector != null &&
    workingOffset?.confirmedVector !== RESET_TO_DEFAULT
  ) {
    return existingOffset.vector
  } else {
    return null
  }
}

// Calculate the confirmed vector based on initial position, final position, and existing vector.
export function calculateConfirmedVector(
  initialPosition: VectorOffset | null,
  finalPosition: VectorOffset | null,
  mostRecentVector: VectorOffset = IDENTITY_VECTOR
): VectorOffset | null {
  if (initialPosition == null || finalPosition == null) {
    return null
  } else {
    return getVectorSum(
      mostRecentVector,
      getVectorDifference(finalPosition, initialPosition)
    )
  }
}

// Find location-specific offset details that match the provided location.
export function findMatchingLocationOffset(
  locationOffsets: LocationSpecificOffsetDetails[],
  targetLocation: OffsetLocationDetails
): { index: number; details: LocationSpecificOffsetDetails | null } {
  const index = locationOffsets.findIndex(detail =>
    isEqual(targetLocation, detail.locationDetails)
  )

  return {
    index,
    details: index >= 0 ? locationOffsets[index] : null,
  }
}

// Create an updated working default offset based on the position action type.
export function createUpdatedWorkingDefaultOffset(
  actionType: 'SET_INITIAL_POSITION' | 'SET_FINAL_POSITION',
  position: VectorOffset,
  currentWorkingOffset: WorkingDefaultOffset | null,
  mostValidVector: VectorOffset | null
): WorkingDefaultOffset {
  if (currentWorkingOffset == null) {
    return {
      initialPosition: actionType === 'SET_INITIAL_POSITION' ? position : null,
      finalPosition: actionType === 'SET_FINAL_POSITION' ? position : null,
      confirmedVector: null,
    }
  } else if (actionType === 'SET_INITIAL_POSITION') {
    return {
      ...currentWorkingOffset,
      initialPosition: position,
      finalPosition: null,
    }
  }
  // Update final position and calculate confirmed vector.
  else {
    return {
      ...currentWorkingOffset,
      finalPosition: position,
      confirmedVector: calculateConfirmedVector(
        currentWorkingOffset.initialPosition,
        position,
        currentWorkingOffset.confirmedVector ??
          mostValidVector ??
          IDENTITY_VECTOR
      ),
    }
  }
}

// Create an updated working locationSpecific offset based on the position action type.
export function createUpdatedWorkingLocationSpecificOffset(
  actionType: 'SET_INITIAL_POSITION' | 'SET_FINAL_POSITION',
  position: VectorOffset,
  currentWorkingOffset: WorkingLocationSpecificOffset | null,
  mostValidVector: VectorOffset | null
): WorkingLocationSpecificOffset {
  if (currentWorkingOffset == null) {
    return {
      initialPosition: actionType === 'SET_INITIAL_POSITION' ? position : null,
      finalPosition: actionType === 'SET_FINAL_POSITION' ? position : null,
      confirmedVector: null,
    }
  } else if (actionType === 'SET_INITIAL_POSITION') {
    return {
      ...currentWorkingOffset,
      initialPosition: position,
      finalPosition: null,
    }
  } else if (currentWorkingOffset.confirmedVector === RESET_TO_DEFAULT) {
    return {
      ...currentWorkingOffset,
      finalPosition: null,
      confirmedVector: RESET_TO_DEFAULT,
    }
  }
  // Update final position and calculate confirmed vector.
  else {
    return {
      ...currentWorkingOffset,
      finalPosition: position,
      confirmedVector: calculateConfirmedVector(
        currentWorkingOffset.initialPosition,
        position,
        currentWorkingOffset.confirmedVector ??
          mostValidVector ??
          IDENTITY_VECTOR
      ),
    }
  }
}

// Check if the vector equals the default vector.
export function vectorEqualsDefault(
  vector: VectorOffset | 'RESET_TO_DEFAULT' | null,
  defaultVector: VectorOffset | null
): boolean {
  if (vector === RESET_TO_DEFAULT) {
    return true
  } else if (vector === null && defaultVector === null) {
    return true
  } else if (vector === null || defaultVector === null) {
    return false
  } else {
    return isEqual(vector, defaultVector)
  }
}

// Find the appropriate vector to use based on a cascade of fallbacks.
export function findLocationSpecificOffsetWithFallbacks(
  relevantDetail: LocationSpecificOffsetDetails,
  defaultOffsetDetails: DefaultOffsetDetails | null
): VectorOffset | null {
  const workingConfirmedVector = relevantDetail.workingOffset?.confirmedVector

  return workingConfirmedVector === RESET_TO_DEFAULT
    ? findDefaultOffsetWithFallbacks(defaultOffsetDetails)
    : workingConfirmedVector ??
        relevantDetail.existingOffset?.vector ??
        findDefaultOffsetWithFallbacks(defaultOffsetDetails)
}

export function findDefaultOffsetWithFallbacks(
  defaultOffsetDetails: DefaultOffsetDetails | null
): VectorOffset | null {
  return (
    defaultOffsetDetails?.workingOffset?.confirmedVector ??
    defaultOffsetDetails?.existingOffset?.vector ??
    null
  )
}
