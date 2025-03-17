import type {
  LabwareDefinition2,
  LoadLabwareCreateCommand,
} from '@opentrons/shared-data'

import type { MoveLiquidPrefixType } from '../../../resources/types'

export const getMigratedPositionFromTop = (
  labwareDefinitions: {
    [definitionId: string]: LabwareDefinition2
  },
  loadLabwareCommands: LoadLabwareCreateCommand[],
  labware: string,
  type: MoveLiquidPrefixType
): number => {
  const matchingLoadLabware = loadLabwareCommands.find(
    command =>
      command.commandType === 'loadLabware' &&
      command.params.labwareId === labware
  )
  if (matchingLoadLabware == null) {
    console.error(
      `expected to find matching ${type} labware load command but could not with ${type}_labware from form data as ${labware}`
    )
  }
  const labwareUri =
    matchingLoadLabware != null
      ? `${matchingLoadLabware.params.namespace}/${matchingLoadLabware.params.loadName}/${matchingLoadLabware.params.version}`
      : ''

  //    early exit for dispense_labware equaling trashBin or wasteChute
  if (labwareDefinitions[labwareUri] == null) {
    return 0
  }

  const matchingLabwareWellDepth = labwareUri
    ? labwareDefinitions[labwareUri].wells.A1.depth
    : 0

  if (matchingLabwareWellDepth === 0) {
    console.error(
      `error in finding the ${type} labware well depth with labware uri ${labwareUri}`
    )
  }
  return matchingLabwareWellDepth
}
