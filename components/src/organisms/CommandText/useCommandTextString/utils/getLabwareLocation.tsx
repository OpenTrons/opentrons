import {
  getLabwareDefURI,
  getLabwareDisplayName,
  getCutoutDisplayName,
  MOVABLE_TRASH_ADDRESSABLE_AREAS,
  WASTE_CHUTE_ADDRESSABLE_AREAS,
} from '@opentrons/shared-data'
import { getModuleDisplayLocation } from './getModuleDisplayLocation'
import { getModuleModel } from './getModuleModel'

import type {
  LabwareDefinition2,
  LabwareLocation,
  ModuleModel,
  RobotType,
  LabwareLocationSequence,
  CutoutId,
  AddressableAreaName,
} from '@opentrons/shared-data'
import type { LoadedLabwares, LoadedModules } from './types'

export interface LocationResult {
  slotName: string
  moduleModel?: ModuleModel
  adapterName?: string
}

interface BaseParams {
  location: LabwareLocation | null
  loadedModules: LoadedModules
  loadedLabwares: LoadedLabwares
  robotType: RobotType
}
interface SequenceBaseParams {
  locationSequence: LabwareLocationSequence
  loadedModules: LoadedModules
  loadedLabwares: LoadedLabwares
}

export interface LocationSlotOnlyParams extends BaseParams {
  detailLevel: 'slot-only'
}

export interface SequenceSlotOnlyParams extends SequenceBaseParams {
  detailLevel: 'slot-only'
}
export interface LocationFullParams extends BaseParams {
  allRunDefs: LabwareDefinition2[]
  detailLevel?: 'full'
}
export interface SequenceFullParams extends SequenceBaseParams {
  allRunDefs: LabwareDefinition2[]
  detailLevel?: 'full'
}

export type GetLabwareLocationParams =
  | LocationSlotOnlyParams
  | LocationFullParams

export type GetLabwareLocationFromSequenceParams =
  | SequenceSlotOnlyParams
  | SequenceFullParams

export function getLabwareLocationFromSequence(
  params: GetLabwareLocationFromSequenceParams
): LocationResult {
  const {
    loadedLabwares,
    loadedModules,
    locationSequence,
    detailLevel = 'full',
  } = params

  return locationSequence.reduce<LocationResult>(
    (acc, sequenceItem) => {
      if (sequenceItem.kind === 'notOnDeck') {
        return {
          slotName: sequenceItem.logicalLocationName,
        }
      } else if (sequenceItem.kind === 'onCutoutFixture') {
        return {
          ...acc,
          slotName: getCutoutDisplayName(sequenceItem.cutoutId as CutoutId),
        }
      } else if (
        sequenceItem.kind === 'onAddressableArea' &&
        (WASTE_CHUTE_ADDRESSABLE_AREAS.includes(
          sequenceItem.addressableAreaName as AddressableAreaName
        ) ||
          MOVABLE_TRASH_ADDRESSABLE_AREAS.includes(
            sequenceItem.addressableAreaName as AddressableAreaName
          ))
      ) {
        return {
          slotName: sequenceItem.addressableAreaName,
        }
      } else if (detailLevel === 'full') {
        const { allRunDefs } = params as SequenceFullParams
        if (sequenceItem.kind === 'onLabware' && acc.adapterName == null) {
          if (!Array.isArray(loadedLabwares)) {
            console.error('Cannot get location from loaded labwares object')
          } else {
            const nestedLabware = loadedLabwares.find(
              lw => lw.id === sequenceItem.labwareId
            )
            const nestedLabwareDef = allRunDefs.find(
              def => getLabwareDefURI(def) === nestedLabware?.definitionUri
            )
            const nestedLabwareName =
              nestedLabwareDef != null
                ? getLabwareDisplayName(nestedLabwareDef)
                : ''
            return {
              ...acc,
              adapterName: nestedLabwareName,
            }
          }
        } else if (sequenceItem.kind === 'onModule') {
          const moduleModel = getModuleModel(
            loadedModules,
            sequenceItem.moduleId
          )
          if (moduleModel == null) {
            console.error('labware is located on an unknown module model')
          } else {
            return {
              ...acc,
              moduleModel,
            }
          }
        }
      }
      return { ...acc }
    },
    { slotName: '' }
  )
}

// detailLevel returns additional information about the module and adapter in the same location, if applicable.
// if 'slot-only', returns the underlying slot location.
export function getLabwareLocation(
  params: GetLabwareLocationParams
): LocationResult | null {
  const {
    loadedLabwares,
    loadedModules,
    location,
    detailLevel = 'full',
  } = params

  if (location == null) {
    return null
  } else if (location === 'offDeck') {
    return { slotName: 'offDeck' }
  } else if (location === 'systemLocation') {
    return { slotName: 'systemLocation' }
  } else if ('slotName' in location) {
    return { slotName: location.slotName }
  } else if ('addressableAreaName' in location) {
    return { slotName: location.addressableAreaName }
  } else if ('moduleId' in location) {
    const moduleModel = getModuleModel(loadedModules, location.moduleId)
    if (moduleModel == null) {
      console.error('labware is located on an unknown module model')
      return null
    }
    const slotName = getModuleDisplayLocation(loadedModules, location.moduleId)

    return {
      slotName,
      moduleModel,
    }
  } else if ('labwareId' in location) {
    if (!Array.isArray(loadedLabwares)) {
      console.error('Cannot get location from loaded labwares object')
      return null
    }

    const adapter = loadedLabwares.find(lw => lw.id === location.labwareId)

    if (adapter == null) {
      console.error('labware is located on an unknown adapter')
      return null
    } else if (detailLevel === 'slot-only') {
      return getLabwareLocation({
        ...params,
        location: adapter.location,
      })
    } else if (detailLevel === 'full') {
      const { allRunDefs } = params as LocationFullParams
      const adapterDef = allRunDefs.find(
        def => getLabwareDefURI(def) === adapter?.definitionUri
      )
      const adapterName =
        adapterDef != null ? getLabwareDisplayName(adapterDef) : ''

      if (
        adapter.location === 'offDeck' ||
        adapter.location === 'systemLocation'
      ) {
        return { slotName: 'offDeck', adapterName }
      } else if (
        'slotName' in adapter.location ||
        'addressableAreaName' in adapter.location
      ) {
        const slotName =
          'slotName' in adapter.location
            ? adapter.location.slotName
            : adapter.location.addressableAreaName
        return { slotName, adapterName }
      } else if ('moduleId' in adapter.location) {
        const moduleIdUnderAdapter = adapter.location.moduleId

        if (!Array.isArray(loadedModules)) {
          console.error('Cannot get location from loaded modules object')
          return null
        }

        const moduleModel = loadedModules.find(
          module => module.id === moduleIdUnderAdapter
        )?.model

        if (moduleModel == null) {
          console.error('labware is located on an adapter on an unknown module')
          return null
        }

        const slotName = getModuleDisplayLocation(
          loadedModules,
          adapter.location.moduleId
        )

        return {
          slotName,
          moduleModel,
          adapterName,
        }
      } else if ('labwareId' in adapter.location) {
        return getLabwareLocation({
          ...params,
          location: adapter.location,
        })
      } else {
        return null
      }
    } else {
      console.error('Unhandled detailLevel.')
      return null
    }
  } else {
    return null
  }
}
