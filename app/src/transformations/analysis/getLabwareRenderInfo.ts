import { getPositionFromSlotId } from '@opentrons/shared-data'
import type {
  CompletedProtocolAnalysis,
  DeckDefinition,
  LabwareDefinition2,
  LoadLabwareRunTimeCommand,
  ProtocolAnalysisOutput,
  LoadLidRunTimeCommand,
  LoadLidStackRunTimeCommand,
} from '@opentrons/shared-data'

export interface LabwareRenderInfoById {
  [labwareId: string]: {
    x: number
    y: number
    z: number
    labwareDef: LabwareDefinition2
    displayName: string | null
    slotName: string
  }
}

export const getLabwareRenderInfo = (
  protocolData: CompletedProtocolAnalysis | ProtocolAnalysisOutput,
  deckDef: DeckDefinition
): LabwareRenderInfoById =>
  protocolData.commands
    .filter((command): command is
      | LoadLabwareRunTimeCommand
      | LoadLidRunTimeCommand
      | LoadLidStackRunTimeCommand =>
      ['loadLabware', 'loadLid', 'loadLidStack'].includes(command.commandType)
    )
    .reduce((acc, command) => {
      const labwareId = command.result?.labwareId
      const location = command.params.location
      const displayName = command.params.displayName ?? null
      const labwareDef = command.result?.definition
      if (
        location === 'offDeck' ||
        location === 'systemLocation' ||
        'moduleId' in location ||
        'labwareId' in location
      )
        return acc
      if (labwareId == null) {
        throw new Error('expected to find labware id but could not')
      }
      if (labwareDef == null) {
        throw new Error(
          `expected to find labware def for labware id ${String(
            labwareId
          )} but could not`
        )
      }

      const slotName =
        'addressableAreaName' in location
          ? location.addressableAreaName
          : location.slotName
      const slotPosition = getPositionFromSlotId(slotName, deckDef)

      if (slotPosition == null) {
        console.warn(
          `expected to find a position for slot ${slotName} in the standard deck definition, but could not`
        )
        return acc
      }
      const isSlot = deckDef.locations.addressableAreas.some(
        aa =>
          aa.id === slotName &&
          (aa.areaType === 'slot' || aa.areaType === 'stagingSlot')
      )

      return isSlot
        ? {
            ...acc,
            [labwareId]: {
              x: slotPosition[0],
              y: slotPosition[1],
              z: slotPosition[2],
              labwareDef,
              displayName,
              slotName,
            },
          }
        : acc
    }, {})
