import isEqual from 'lodash/isEqual'
import {
  FLEX_SINGLE_SLOT_ADDRESSABLE_AREAS,
  getLabwareDefURI,
  OT2_SINGLE_SLOT_ADDRESSABLE_AREAS,
} from '@opentrons/shared-data'
import type {
  AddressableAreaName,
  ProtocolAnalysisOutput,
  RunTimeCommand,
} from '@opentrons/shared-data'
import type { LegacyLabwareOffsetLocation } from '@opentrons/api-client'

export interface LegacyLabwareLocationCombo {
  location: LegacyLabwareOffsetLocation
  definitionUri: string
  labwareId: string
  moduleId?: string
  adapterId?: string
}

// Dev note: This only needs to be updated if analysis output changes affect the OT-2.
// The flex does not make use of this util!
export function getLegacyLabwareLocationCombos(
  commands: RunTimeCommand[],
  labware: ProtocolAnalysisOutput['labware'],
  modules: ProtocolAnalysisOutput['modules']
): LegacyLabwareLocationCombo[] {
  return commands
    .reduce<LegacyLabwareLocationCombo[]>((acc, command) => {
      if (command.commandType === 'loadLabware') {
        if (
          command.result?.definition == null ||
          command.result.definition.parameters.format === 'trash'
        )
          return acc
        const definitionUri = getLabwareDefURI(command.result.definition)
        if (
          command.params.location === 'offDeck' ||
          command.params.location === 'systemLocation'
        ) {
          return acc
        } else if ('moduleId' in command.params.location) {
          const { moduleId } = command.params.location
          const modLocation = resolveModuleLocation(modules, moduleId)
          return modLocation == null
            ? acc
            : appendLocationComboIfUniq(acc, {
                location: modLocation,
                definitionUri,
                labwareId: command.result.labwareId,
                moduleId,
              })
        } else if ('labwareId' in command.params.location) {
          const {
            adapterOffsetLocation,
            moduleIdUnderAdapter,
          } = resolveAdapterLocation(
            labware,
            modules,
            command.params.location.labwareId
          )
          return adapterOffsetLocation == null
            ? acc
            : appendLocationComboIfUniq(acc, {
                location: adapterOffsetLocation,
                definitionUri,
                labwareId: command.result.labwareId,
                moduleId: moduleIdUnderAdapter,
                adapterId: command.params.location.labwareId,
              })
        } else {
          return appendLocationComboIfUniq(acc, {
            location: {
              slotName:
                'addressableAreaName' in command.params.location
                  ? command.params.location.addressableAreaName
                  : command.params.location.slotName,
            },
            definitionUri,
            labwareId: command.result.labwareId,
          })
        }
      } else if (command.commandType === 'moveLabware') {
        const labwareEntity = labware.find(
          l => l.id === command.params.labwareId
        )
        if (labwareEntity == null) {
          console.warn(
            'moveLabware command specified a labwareId that could not be found in the labware entities'
          )
          return acc
        }
        if (
          command.params.newLocation === 'offDeck' ||
          command.params.newLocation === 'systemLocation'
        ) {
          return acc
        } else if ('moduleId' in command.params.newLocation) {
          const modLocation = resolveModuleLocation(
            modules,
            command.params.newLocation.moduleId
          )
          return modLocation == null
            ? acc
            : appendLocationComboIfUniq(acc, {
                location: modLocation,
                definitionUri: labwareEntity.definitionUri,
                labwareId: command.params.labwareId,
                moduleId: command.params.newLocation.moduleId,
              })
        } else if ('labwareId' in command.params.newLocation) {
          const {
            adapterOffsetLocation,
            moduleIdUnderAdapter,
          } = resolveAdapterLocation(
            labware,
            modules,
            command.params.newLocation.labwareId
          )
          return adapterOffsetLocation == null
            ? acc
            : appendLocationComboIfUniq(acc, {
                location: adapterOffsetLocation,
                definitionUri: labwareEntity.definitionUri,
                labwareId: command.params.labwareId,
                moduleId: moduleIdUnderAdapter,
                adapterId: command.params.newLocation.labwareId,
              })
        } else {
          return appendLocationComboIfUniq(acc, {
            location: {
              slotName:
                'addressableAreaName' in command.params.newLocation
                  ? command.params.newLocation.addressableAreaName
                  : command.params.newLocation.slotName,
            },
            definitionUri: labwareEntity.definitionUri,
            labwareId: command.params.labwareId,
          })
        }
      } else if (command.commandType === 'flexStacker/retrieve') {
        if (command?.result == null) {
          return acc
        }
        const modLocation = resolveModuleLocation(
          modules,
          command.params.moduleId
        )
        if (modLocation == null) {
          return acc
        }

        if (command.result.adapterId != null) {
          return appendLocationComboIfUniq(acc, {
            location: {
              ...modLocation,
              definitionUri: command.result.adapterLabwareURI,
            },
            definitionUri: command.result.primaryLabwareURI,
            labwareId: command.result.labwareId,
            moduleId: command.params.moduleId,
            adapterId: command.result.adapterId,
          })
        } else {
          return appendLocationComboIfUniq(acc, {
            location: modLocation,
            definitionUri: command.result.primaryLabwareURI,
            labwareId: command.result.labwareId,
            moduleId: command.params.moduleId,
          })
        }
      } else {
        return acc
      }
    }, [])
    .filter(
      ({ location }) =>
        FLEX_SINGLE_SLOT_ADDRESSABLE_AREAS.includes(
          location.slotName as AddressableAreaName
        ) ||
        OT2_SINGLE_SLOT_ADDRESSABLE_AREAS.includes(
          location.slotName as AddressableAreaName
        )
    )
}

function appendLocationComboIfUniq(
  acc: LegacyLabwareLocationCombo[],
  locationCombo: LegacyLabwareLocationCombo
): LegacyLabwareLocationCombo[] {
  const locationComboAlreadyExists = acc.some(
    combo =>
      combo.labwareId === locationCombo.labwareId &&
      isEqual(combo.location, locationCombo.location) &&
      combo.definitionUri === locationCombo.definitionUri
  )
  return locationComboAlreadyExists ? acc : [...acc, locationCombo]
}

function resolveModuleLocation(
  modules: ProtocolAnalysisOutput['modules'],
  moduleId: string
): LegacyLabwareOffsetLocation | null {
  const moduleEntity = modules.find(m => m.id === moduleId)
  if (moduleEntity == null) {
    console.warn(
      'command specified a moduleId that could not be found in the module entities'
    )
    return null
  }
  return {
    slotName: moduleEntity.location.slotName,
    moduleModel: moduleEntity.model,
  }
}

interface ResolveAdapterLocation {
  adapterOffsetLocation: LegacyLabwareOffsetLocation | null
  moduleIdUnderAdapter?: string
}
function resolveAdapterLocation(
  labware: ProtocolAnalysisOutput['labware'],
  modules: ProtocolAnalysisOutput['modules'],
  labwareId: string
): ResolveAdapterLocation {
  const labwareEntity = labware.find(l => l.id === labwareId)
  if (labwareEntity == null) {
    console.warn(
      `command specified an adapter ${labwareId} that could not be found in the labware entities`
    )
    return { adapterOffsetLocation: null }
  }
  const labwareDefUri = labwareEntity.definitionUri

  let moduleIdUnderAdapter
  let adapterOffsetLocation: LegacyLabwareOffsetLocation | null = null
  if (
    labwareEntity.location === 'offDeck' ||
    labwareEntity.location === 'systemLocation'
  ) {
    return { adapterOffsetLocation: null }
    // can't have adapter on top of an adapter
  } else if ('labwareId' in labwareEntity.location) {
    return { adapterOffsetLocation: null }
  } else if ('moduleId' in labwareEntity.location) {
    const moduleId = labwareEntity.location.moduleId
    const resolvedModuleLocation: LegacyLabwareOffsetLocation | null = resolveModuleLocation(
      modules,
      moduleId
    )

    moduleIdUnderAdapter = moduleId
    adapterOffsetLocation =
      resolvedModuleLocation != null
        ? {
            definitionUri: labwareDefUri,
            ...resolvedModuleLocation,
          }
        : null
  } else {
    adapterOffsetLocation = {
      definitionUri: labwareDefUri,
      slotName:
        'addressableAreaName' in labwareEntity.location
          ? labwareEntity.location.addressableAreaName
          : labwareEntity.location.slotName,
    }
  }
  return {
    adapterOffsetLocation: adapterOffsetLocation,
    moduleIdUnderAdapter,
  }
}
