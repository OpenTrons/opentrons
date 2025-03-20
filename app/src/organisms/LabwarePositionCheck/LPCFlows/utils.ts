import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'
import { ANY_LOCATION } from '@opentrons/api-client'

import type {
  LabwareOffset,
  LabwareOffsetCreateData,
  LegacyLabwareOffsetCreateData,
  StoredLabwareOffset,
} from '@opentrons/api-client'
import type { RobotType } from '@opentrons/shared-data'

// Returns the offsets to use during maintenance run creation depending on the robot type.
export function getRelevantOffsets(
  robotType: RobotType,
  ot2Offsets: LabwareOffset[],
  flexOffsets: StoredLabwareOffset[]
): LabwareOffsetCreateData[] | LegacyLabwareOffsetCreateData[] {
  // Default offsets are persisted on the robot, but they are never used in a run.
  const flexLabwareOffsets = flexOffsets.reduce<LabwareOffsetCreateData[]>(
    (acc, { vector, locationSequence, definitionUri }) => {
      if (locationSequence === ANY_LOCATION) {
        return acc
      } else {
        return [
          ...acc,
          {
            vector,
            locationSequence,
            definitionUri,
          },
        ]
      }
    },
    []
  )
  const ot2LabwareOffsets = ot2Offsets.map(
    ({ vector, location, definitionUri }) => ({
      vector,
      location,
      definitionUri,
    })
  )
  return robotType === FLEX_ROBOT_TYPE ? flexLabwareOffsets : ot2LabwareOffsets
}
