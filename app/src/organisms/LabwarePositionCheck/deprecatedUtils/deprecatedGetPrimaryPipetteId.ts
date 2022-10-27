import { getPipetteNameSpecs } from '@opentrons/shared-data'
import type {
  RunTimeCommand,
  ProtocolFile,
} from '@opentrons/shared-data/protocol'
import { LoadPipetteRunTimeCommand } from '@opentrons/shared-data/protocol/types/schemaV6/command/setup'

export const deprecatedGetPrimaryPipetteId = (
  pipettesById: ProtocolFile<{}>['pipettes'],
  commands: RunTimeCommand[]
): string => {
  if (Object.keys(pipettesById).length === 1) {
    return Object.keys(pipettesById)[0]
  }

  const leftPipetteId = commands.find(
    (command: RunTimeCommand): command is LoadPipetteRunTimeCommand =>
      command.commandType === 'loadPipette' && command.params.mount === 'left'
  )?.result?.pipetteId
  const rightPipetteId = commands.find(
    (command: RunTimeCommand): command is LoadPipetteRunTimeCommand =>
      command.commandType === 'loadPipette' && command.params.mount === 'right'
  )?.result?.pipetteId

  if (leftPipetteId == null || rightPipetteId == null) {
    throw new Error(
      'expected to find both left pipette and right pipette but could not'
    )
  }

  const leftPipette = pipettesById[leftPipetteId]
  const rightPipette = pipettesById[rightPipetteId]

  const leftPipetteSpecs = getPipetteNameSpecs(leftPipette.name)
  const rightPipetteSpecs = getPipetteNameSpecs(rightPipette.name)

  if (leftPipetteSpecs == null) {
    throw new Error(`could not find pipette specs for ${leftPipette.name}`)
  }
  if (rightPipetteSpecs == null) {
    throw new Error(`could not find pipette specs for ${rightPipette.name}`)
  }

  // prefer pipettes with fewer channels
  if (leftPipetteSpecs.channels !== rightPipetteSpecs.channels) {
    return leftPipetteSpecs.channels < rightPipetteSpecs.channels
      ? leftPipetteId
      : rightPipetteId
  }
  // prefer pipettes with smaller maxVolume
  if (leftPipetteSpecs.maxVolume !== rightPipetteSpecs.maxVolume) {
    return leftPipetteSpecs.maxVolume < rightPipetteSpecs.maxVolume
      ? leftPipetteId
      : rightPipetteId
  }

  const leftPipetteGenerationCompare = leftPipetteSpecs.displayCategory.localeCompare(
    rightPipetteSpecs.displayCategory
  )
  // prefer new pipette models
  if (leftPipetteGenerationCompare !== 0) {
    return leftPipetteGenerationCompare > 0 ? leftPipetteId : rightPipetteId
  }
  // if all else is the same, prefer the left pipette
  return leftPipetteId
}
