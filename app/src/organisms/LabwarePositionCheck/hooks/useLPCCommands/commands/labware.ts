import type { CreateCommand } from '@opentrons/shared-data'
import type { OffsetLocationDetails } from '/app/redux/protocol-runs'

export function moveLabwareOffDeckCommands(
  offsetLocationDetails: OffsetLocationDetails
): CreateCommand[] {
  return offsetLocationDetails.lwModOnlyStackupDetails.reduce<CreateCommand[]>(
    (acc, component) => {
      if (component.kind === 'onModule') {
        return acc
      } else {
        return [
          ...acc,
          {
            commandType: 'moveLabware' as const,
            params: {
              labwareId: component.id,
              newLocation: 'offDeck',
              strategy: 'manualMoveWithoutPause',
            },
          },
        ]
      }
    },
    []
  )
}
