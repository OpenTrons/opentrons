import {
  getLabwareDefURI,
  getAllDefinitions,
  getCutoutDisplayName,
  OnCutoutFixtureLocationSequenceComponent,
  THERMOCYCLER_MODULE_V2,
} from '@opentrons/shared-data'

import type {
  LabwareDefinition2,
  ModuleModel,
  RunTimeCommand,
  LoadLabwareRunTimeCommand,
  LoadLidRunTimeCommand,
  LoadLidStackRunTimeCommand,
  LoadedLabware,
  CutoutId,
  LoadedModule,
  LoadLidParams,
} from '@opentrons/shared-data'

export interface LabwareInStack {
  definitionUri: string
  displayName: string
  labwareId: string
  lidId?: string
  lidDisplayName?: string
}
export interface ModuleInStack {
  moduleModel: ModuleModel
  moduleId: string
}

export type StackItem = LabwareInStack | ModuleInStack

export interface StackedItemsOnDeck {
  [slotName: string]: StackItem[]
}

interface LoadLidOnLabwareParams extends Omit<LoadLidParams, 'location'> {
  location: {
    labwareId: string
  }
}
interface LoadLidOnLabwareCommad extends Omit<LoadLidRunTimeCommand, 'params'> {
  params: LoadLidOnLabwareParams
}

/**
 * This function parses all commands that load labware in reverse order and makes a map of
 * shape [slotName]: ordered list of stacked items in slot at the start of a protocol, returning
 * exactly one array per utilized slot in the starting deck state
 * with an additional list for all off deck items
 * @param commands
 * @param loadedLabware
 * @param loadedModules
 * @returns [slotName]: StackItem[]
 */

export function getStackedItemsOnStartingDeck(
  commands: RunTimeCommand[],
  loadedLabware: LoadedLabware[],
  loadedModules: LoadedModule[]
): StackedItemsOnDeck {
  const labwareDefinitions = getAllDefinitions()
  const loadLidCommands = commands.filter(
    (command): command is LoadLidOnLabwareCommad =>
      command.commandType === 'loadLid' &&
      command.params.location !== 'offDeck' &&
      command.params.location !== 'systemLocation' &&
      'labwareId' in command.params.location
  )
  return commands
    .filter((command): command is
      | LoadLabwareRunTimeCommand
      | LoadLidStackRunTimeCommand =>
      ['loadLabware', 'loadLidStack'].includes(command.commandType)
    )
    .reverse()
    .reduce<StackedItemsOnDeck>((acc, command) => {
      let stackFromCommand: StackItem[] = []
      let location = ''
      if (command.params.location === 'systemLocation') return acc
      else if (
        command.params.location === 'offDeck' &&
        command.result != null
      ) {
        const offDeckArray = Object.keys(acc).includes('offDeck')
          ? acc['offDeck']
          : []
        if (command.commandType === 'loadLabware') {
          const offDeckItem: LabwareInStack = {
            labwareId: command.result.labwareId,
            definitionUri: getLabwareDefURI(command.result.definition),
            displayName:
              command.params.displayName ??
              command.result.definition.metadata.displayName,
          }
          const lidCommand = loadLidCommands.find(
            lidCommand =>
              lidCommand.params.location.labwareId === command.result?.labwareId
          )
          offDeckItem.lidDisplayName =
            lidCommand?.result != null
              ? lidCommand.result.definition.metadata.displayName
              : undefined
          offDeckItem.lidId =
            lidCommand?.result != null ? lidCommand.result.labwareId : undefined
          offDeckArray.push(offDeckItem)
        } else if (
          command.commandType === 'loadLidStack' &&
          command.result?.definition != null
        ) {
          command.result.labwareIds.forEach(labwareId => {
            const offDeckItem = {
              labwareId: labwareId,
              definitionUri: getLabwareDefURI(
                command.result?.definition as LabwareDefinition2
              ),
              displayName:
                command.result?.definition?.metadata.displayName ?? '',
            }
            offDeckArray.push(offDeckItem)
          })
        }
        return { ...acc, ['offDeck']: offDeckArray }
      } else if (
        command.commandType === 'loadLabware' &&
        command.result?.locationSequence != null
      ) {
        const locationSequence = command.result.locationSequence
        const cutoutId = locationSequence.find(
          (
            sequenceItem
          ): sequenceItem is OnCutoutFixtureLocationSequenceComponent =>
            sequenceItem.kind === 'onCutoutFixture'
        )?.cutoutId
        location = getCutoutDisplayName(cutoutId as CutoutId)
        if (cutoutId == null || Object.keys(acc).includes(location)) {
          return acc
        }
        const topLabware: LabwareInStack = {
          labwareId: command.result.labwareId,
          definitionUri: getLabwareDefURI(command.result.definition),
          displayName:
            command.params.displayName ??
            command.result.definition.metadata.displayName,
        }
        const lidCommand = loadLidCommands.find(
          lidCommand =>
            lidCommand.params.location.labwareId === command.result?.labwareId
        )
        topLabware.lidDisplayName =
          lidCommand?.result != null
            ? lidCommand.result.definition.metadata.displayName
            : undefined
        topLabware.lidId =
          lidCommand?.result != null ? lidCommand.result.labwareId : undefined

        stackFromCommand = locationSequence.reduce<StackItem[]>(
          (sequenceAcc, sequenceItem) => {
            if (sequenceItem.kind === 'onLabware') {
              const labware = loadedLabware.find(
                lw => lw.id === sequenceItem.labwareId
              )
              if (labware == null) return sequenceAcc
              const labwareDef = labwareDefinitions[labware.definitionUri]
              const labwareStackItem: LabwareInStack = {
                definitionUri: labware.definitionUri,
                displayName:
                  labware.displayName ?? labwareDef.metadata.displayName,
                labwareId: sequenceItem.labwareId,
              }
              const lid =
                sequenceItem.lidId != null
                  ? loadedLabware.find(lw => lw.id === sequenceItem.lidId)
                  : null
              if (sequenceItem.lidId != null && lid != null) {
                const lidDef = labwareDefinitions[lid.definitionUri]
                labwareStackItem.lidDisplayName = lidDef.metadata.displayName
                labwareStackItem.lidId = sequenceItem.lidId
              }
              sequenceAcc.push(labwareStackItem)
              return sequenceAcc
            } else if (sequenceItem.kind === 'onModule') {
              const module = loadedModules.find(
                lm => lm.id === sequenceItem.moduleId
              )
              if (module == null) return sequenceAcc
              const moduleStackItem: ModuleInStack = {
                moduleId: sequenceItem.moduleId,
                moduleModel: module.model,
              }
              if (module.model === THERMOCYCLER_MODULE_V2) {
                location = 'A1+B1'
              }
              sequenceAcc.push(moduleStackItem)
            }
            return sequenceAcc
          },
          [topLabware]
        )
      } else if (
        command.commandType === 'loadLidStack' &&
        command.result?.definition != null &&
        command.result?.stackLocationSequence != null
      ) {
        const locationSequence = command.result.stackLocationSequence
        const cutoutId = locationSequence.find(
          (
            sequenceItem
          ): sequenceItem is OnCutoutFixtureLocationSequenceComponent =>
            sequenceItem.kind === 'onCutoutFixture'
        )?.cutoutId
        location = getCutoutDisplayName(cutoutId as CutoutId)
        if (cutoutId == null || Object.keys(acc).includes(location)) {
          return acc
        }
        const lidsArray: LabwareInStack[] = command.result.labwareIds
          .reverse()
          .map(lidId => {
            return {
              labwareId: lidId,
              definitionUri: getLabwareDefURI(
                command.result?.definition as LabwareDefinition2
              ),
              displayName:
                command.result?.definition?.metadata.displayName ?? '',
            }
          })
        stackFromCommand = command.result.stackLocationSequence.reduce<
          StackItem[]
        >((sequenceAcc, sequenceItem) => {
          if (sequenceItem.kind === 'onLabware') {
            const labware = loadedLabware.find(
              lw => lw.id === sequenceItem.labwareId
            )
            if (labware == null) return sequenceAcc
            const labwareDef = labwareDefinitions[labware.definitionUri]
            const labwareStackItem: LabwareInStack = {
              definitionUri: labware.definitionUri,
              displayName:
                labware.displayName ?? labwareDef.metadata.displayName,
              labwareId: sequenceItem.labwareId,
            }
            sequenceAcc.push(labwareStackItem)
          }
          return sequenceAcc
        }, lidsArray)
      }
      return { ...acc, [location]: stackFromCommand }
    }, {})
}
