import isEqual from 'lodash/isEqual'

import type { LabwareOffset } from '@opentrons/api-client'

// Sort offsets by most recent first, removing duplicates.
export function sortUniqueOffsets(offsets: LabwareOffset[]): LabwareOffset[] {
  return (
    offsets
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .reduce<LabwareOffset[]>((acc, offset) => {
        if (
          acc.some(
            existingOffset =>
              isEqual(existingOffset.definitionUri, offset.definitionUri) &&
              isEqual(existingOffset.locationSequence, offset.locationSequence)
          )
        ) {
          return acc
        } else {
          return [...acc, offset]
        }
      }, []) ?? []
  )
}
