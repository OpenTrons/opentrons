import type { CreateCommand } from '@opentrons/shared-data'
import type { AdditionalEquipment } from '../FileSidebar'

export const getUnusedStagingAreas = (
  additionalEquipment: AdditionalEquipment,
  commands?: CreateCommand[]
): string[] => {
  const stagingAreaSlots = Object.values(additionalEquipment)
    .filter(equipment => equipment?.name === 'stagingArea')
    .map(equipment => {
      if (equipment.location == null) {
        console.error(
          `expected to find staging area slot location with id ${equipment.id} but could not.`
        )
      }
      return equipment.location ?? ''
    })

  const corresponding4thColumnSlots = stagingAreaSlots.map(slot => {
    const letter = slot.charAt(0)
    const correspondingLocation = stagingAreaSlots.find(slot =>
      slot.startsWith(letter)
    )
    if (correspondingLocation) {
      return letter + '4'
    }

    return slot
  })

  const stagingAreaCommandSlots: string[] = corresponding4thColumnSlots.filter(
    location =>
      commands?.filter(
        command =>
          (command.commandType === 'loadLabware' &&
            command.params.location !== 'offDeck' &&
            'slotName' in command.params.location &&
            command.params.location.slotName === location) ||
          (command.commandType === 'moveLabware' &&
            command.params.newLocation !== 'offDeck' &&
            'slotName' in command.params.newLocation &&
            command.params.newLocation.slotName === location)
      )
        ? location
        : null
  )

  return stagingAreaCommandSlots
}
