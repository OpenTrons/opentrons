import { getInitialLoadedLabwareByAdapter } from './getInitiallyLoadedLabwareByAdapter'
import type {
  CompletedProtocolAnalysis,
  LoadLabwareRunTimeCommand,
  MoveLabwareRunTimeCommand,
  ProtocolAnalysisOutput,
  LabwareDefinition2,
  LoadLidRunTimeCommand,
  LoadLidStackRunTimeCommand,
} from '@opentrons/shared-data'

interface LabwareInSlot {
  labwareId: string
  labwareDef: LabwareDefinition2
  labwareNickName: string | null
  location: { slotName: string }
}

interface LabwareWithDef {
  labwareId: string
  labwareDef: LabwareDefinition2
  labwareNickName: string | null
}

export const getInitialAndMovedLabwareInSlots = (
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
): LabwareInSlot[] => {
  const { commands } = protocolAnalysis
  const initialLoadedLabwareByAdapter = getInitialLoadedLabwareByAdapter(
    commands
  )
  const topMostLabwareInSlots = getTopMostLabwareInSlots(protocolAnalysis)
  const allLabwareDefs = getAllLabwareDefinitions(protocolAnalysis)

  return commands
    .filter(
      (command): command is MoveLabwareRunTimeCommand =>
        command.commandType === 'moveLabware'
    )
    .reduce<LabwareInSlot[]>((acc, command) => {
      const labwareId = command.params.labwareId
      const location = command.params.newLocation

      const originalLabware = allLabwareDefs.find(
        labware => labware.labwareId === labwareId
      )
      const labwareDef = originalLabware?.labwareDef

      if (
        location === 'offDeck' ||
        location === 'systemLocation' ||
        'moduleId' in location ||
        'labwareId' in location
      )
        return acc
      if (labwareId == null) {
        console.warn(
          `expected to find labware id from command id ${String(
            command.id
          )} but could not`
        )
        return acc
      }
      if (labwareDef == null) {
        console.warn(
          `expected to find labware def for labware id ${String(
            labwareId
          )} in command id ${String(command.id)} but could not`
        )
        return acc
      }

      const slotName =
        'addressableAreaName' in location
          ? location.addressableAreaName
          : location.slotName

      // if list of labware already includes slotName, return acc
      if (acc.find(labware => labware.location.slotName === slotName) != null) {
        return acc
      }

      const labwareInAdapter = initialLoadedLabwareByAdapter[labwareId]

      //  NOTE: only grabbing the labware on top most layer so
      //  either the adapter or the labware but not both
      const topLabwareDefinition =
        labwareInAdapter?.result?.definition ?? labwareDef
      const topLabwareId = labwareInAdapter?.result?.labwareId ?? labwareId
      const topLabwareNickName =
        labwareInAdapter?.params?.displayName ??
        originalLabware?.labwareNickName ??
        null

      return [
        ...acc,
        {
          labwareId: topLabwareId,
          labwareDef: topLabwareDefinition,
          labwareNickName: topLabwareNickName,
          location: { slotName },
        },
      ]
    }, topMostLabwareInSlots)
}

export const getTopMostLabwareInSlots = (
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
): LabwareInSlot[] => {
  const { commands } = protocolAnalysis
  const initialLoadedLabwareByAdapter = getInitialLoadedLabwareByAdapter(
    commands
  )
  const labwareObjects: LabwareInSlot[] = commands
    .filter(
      (command): command is LoadLabwareRunTimeCommand =>
        command.commandType === 'loadLabware'
    )
    .reduce<LabwareInSlot[]>((acc, command) => {
      const labwareId = command.result?.labwareId
      const location = command.params.location
      const labwareDef = command.result?.definition
      if (
        location === 'offDeck' ||
        location === 'systemLocation' ||
        'moduleId' in location ||
        'labwareId' in location
      )
        return acc
      if (labwareId == null) {
        console.warn(
          `expected to find labware id from command id ${String(
            command.id
          )} but could not`
        )
        return acc
      }
      if (labwareDef == null) {
        console.warn(
          `expected to find labware def for labware id ${String(
            labwareId
          )} in command id ${String(command.id)}but could not`
        )
        return acc
      }

      const slotName =
        'addressableAreaName' in location
          ? location.addressableAreaName
          : location.slotName

      const labwareInAdapter = initialLoadedLabwareByAdapter[labwareId]

      //  NOTE: only grabbing the labware on top most layer so
      //  either the adapter or the labware but not both
      const topLabwareDefinition =
        labwareInAdapter?.result?.definition ?? labwareDef
      const topLabwareId = labwareInAdapter?.result?.labwareId ?? labwareId
      const topLabwareNickName =
        labwareInAdapter?.params?.displayName ??
        command.params.displayName ??
        null

      return [
        ...acc,
        {
          labwareId: topLabwareId,
          labwareDef: topLabwareDefinition,
          labwareNickName: topLabwareNickName,
          location: { slotName },
        },
      ]
    }, [])

  const lidStackObjects: LabwareInSlot[] = commands
    .filter(
      (command): command is LoadLidStackRunTimeCommand =>
        command.commandType === 'loadLidStack'
    )
    .reduce<LabwareInSlot[]>((acc, command) => {
      const labwareId = command.result?.labwareIds[0]
      if (labwareId == null) {
        console.warn(
          `expected to find labware id from command id ${String(
            command.id
          )} but could not`
        )
        return acc
      }
      const labwareDef = command.result?.definition
      if (labwareDef == null) {
        console.warn(
          `expected to find labware def for labware id ${String(
            labwareId
          )} in command id ${String(command.id)}but could not`
        )
        return acc
      }
      let location = command.params.location
      if (
        location !== 'offDeck' &&
        location !== 'systemLocation' &&
        'labwareId' in location
      ) {
        const locationLabwareId = location.labwareId
        const adapterCommand = commands.find(
          (command): command is LoadLabwareRunTimeCommand =>
            command.commandType === 'loadLabware' &&
            command.result?.labwareId === locationLabwareId
        )
        if (adapterCommand != null) {
          location = adapterCommand.params.location
        } else {
          return acc
        }
      }
      if (
        location === 'offDeck' ||
        location === 'systemLocation' ||
        'moduleId' in location ||
        'labwareId' in location
      ) {
        return acc
      }

      const slotName =
        'addressableAreaName' in location
          ? location.addressableAreaName
          : location.slotName

      return [
        ...acc,
        {
          labwareId,
          labwareDef,
          labwareNickName: null,
          location: { slotName },
        },
      ]
    }, [])
  return labwareObjects.concat(lidStackObjects)
}

const getAllLabwareDefinitions = (
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput
): LabwareWithDef[] => {
  const { commands } = protocolAnalysis
  const lidAndLabware: LabwareWithDef[] = commands
    .filter((command): command is
      | LoadLabwareRunTimeCommand
      | LoadLidRunTimeCommand =>
      ['loadLabware', 'loadLid'].includes(command.commandType)
    )
    .reduce<LabwareWithDef[]>((acc, command) => {
      const labwareId = command.result?.labwareId
      const labwareDef = command.result?.definition
      if (labwareId == null) {
        console.warn(
          `expected to find labware id from command id ${String(
            command.id
          )} but could not`
        )
        return acc
      }
      if (labwareDef == null) {
        console.warn(
          `expected to find labware def for labware id ${String(
            labwareId
          )} fromm command id ${String(command.id)} but could not`
        )
        return acc
      }
      const displayName =
        command.commandType === 'loadLabware'
          ? command.params?.displayName ?? null
          : null
      return [
        ...acc,
        {
          labwareId: labwareId,
          labwareDef: labwareDef,
          labwareNickName: displayName,
        },
      ]
    }, [])

  const lidStacks: LabwareWithDef[] = commands
    .filter(
      (command): command is LoadLidStackRunTimeCommand =>
        command.commandType === 'loadLidStack'
    )
    .reduce<LabwareWithDef[]>((acc, command) => {
      const lidStackObjects: LabwareWithDef[] = []
      const labwareDef = command.result?.definition
      if (labwareDef == null) {
        console.warn(
          `expected to find labware def for lid stack ${String(
            command.result?.stackLabwareId
          )} fromm command id ${String(command.id)} but could not`
        )
        return acc
      }
      command.result?.labwareIds.forEach(labwareId => {
        lidStackObjects.push({
          labwareId: labwareId,
          labwareDef: labwareDef,
          labwareNickName: null,
        })
      })
      return [...acc, ...lidStackObjects]
    }, [])

  return lidAndLabware.concat(lidStacks)
}
