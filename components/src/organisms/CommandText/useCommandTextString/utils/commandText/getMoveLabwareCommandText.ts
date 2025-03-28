import { GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA } from '@opentrons/shared-data'

import { getFinalLabwareLocation } from '../getFinalLabwareLocation'
import { getLabwareDisplayLocation } from '../getLabwareDisplayLocation'
import { getLabwareName } from '../getLabwareName'

import type { MoveLabwareRunTimeCommand } from '@opentrons/shared-data'
import type { HandlesCommands } from '../types'

export function getMoveLabwareCommandText({
  command,
  allRunDefs,
  t,
  commandTextData,
  robotType,
}: HandlesCommands<MoveLabwareRunTimeCommand>): string {
  const { labwareId, newLocation, strategy } = command.params
  let oldDisplayLocation = null
  let newDisplayLocation = null
  if (
    command.result?.originLocationSequence != null &&
    command.result?.immediateDestinationLocationSequence != null
  ) {
    oldDisplayLocation = getLabwareDisplayLocation({
      location: command.result.originLocationSequence,
      robotType,
      allRunDefs,
      loadedLabwares: commandTextData?.labware ?? [],
      loadedModules: commandTextData?.modules ?? [],
      t,
    })
    newDisplayLocation = getLabwareDisplayLocation({
      location: command.result.immediateDestinationLocationSequence,
      robotType,
      allRunDefs,
      loadedLabwares: commandTextData?.labware ?? [],
      loadedModules: commandTextData?.modules ?? [],
      t,
    })
  } else {
    const allPreviousCommands = commandTextData?.commands.slice(
      0,
      commandTextData.commands.findIndex(c => c.id === command.id)
    )
    const oldLocation =
      allPreviousCommands != null
        ? getFinalLabwareLocation(labwareId, allPreviousCommands)
        : null

    oldDisplayLocation = getLabwareDisplayLocation({
      location: oldLocation?.location,
      robotType,
      allRunDefs,
      loadedLabwares: commandTextData?.labware ?? [],
      loadedModules: commandTextData?.modules ?? [],
      t,
    })
    newDisplayLocation = getLabwareDisplayLocation({
      location: newLocation,
      robotType,
      allRunDefs,
      loadedLabwares: commandTextData?.labware ?? [],
      loadedModules: commandTextData?.modules ?? [],
      t,
    })
  }

  // add waste chute to i18n
  const location = newDisplayLocation?.includes(
    GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA
  )
    ? 'Waste Chute'
    : newDisplayLocation

  // system location is an off deck location we create lid stacks in and
  // move them to and should not be exposed to the user
  if (oldDisplayLocation === 'systemLocation') {
    return t('move_lid_stack_to_deck', { slot_name: newDisplayLocation })
  } else if (newDisplayLocation === 'systemLocation') {
    return t('move_lid_stack_from_deck', { slot_name: oldDisplayLocation })
  }

  return strategy === 'usingGripper'
    ? t('move_labware_using_gripper', {
        labware:
          commandTextData != null
            ? getLabwareName({
                allRunDefs,
                loadedLabwares: commandTextData.labware ?? [],
                labwareId,
              })
            : null,
        old_location: oldDisplayLocation,
        new_location: location,
      })
    : t('move_labware_manually', {
        labware:
          commandTextData != null
            ? getLabwareName({
                allRunDefs,
                loadedLabwares: commandTextData.labware ?? [],
                labwareId,
              })
            : null,
        old_location: oldDisplayLocation,
        new_location: location,
      })
}
