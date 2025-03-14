import type {
  LabwareLocationSequence,
  LoadedLabware,
  LoadedModule,
  ModuleModel,
  OnLabwareLocationSequenceComponent,
  OnModuleLocationSequenceComponent,
} from '@opentrons/shared-data'
import type { LabwareOffsetLocationSequence } from '@opentrons/api-client'
import type { AnalysisLwURIsByLwId } from './getAllPossibleLwURIsInRun'
import type { LabwareModuleOnlyStackupDetails } from '/app/redux/protocol-runs'

// Given a location sequence, find the nearest module that is the beneath the topmost
// location sequence component and return its moduleId, if any.
export function getClosestBeneathModuleId(
  locSeq: LabwareLocationSequence
): string | undefined {
  const moduleSeq = locSeq.findLast(seq => seq.kind === 'onModule')

  return moduleSeq?.kind === 'onModule' ? moduleSeq.moduleId : undefined
}

export function getClosestBeneathModuleModel(
  locSeqModuleId: string | undefined,
  modules: LoadedModule[]
): ModuleModel | undefined {
  const matchingModule = modules.find(mod => mod.id === locSeqModuleId)

  return matchingModule != null ? matchingModule.model : undefined
}

export function getClosestBeneathAdapterId(
  locSeq: LabwareLocationSequence
): string | undefined {
  const lwSeq = locSeq.findLast(seq => seq.kind === 'onLabware')

  return lwSeq?.kind === 'onLabware' ? lwSeq.labwareId : undefined
}

// Get the slot name from the location sequence. If there is no slot name, returns null.
export function getSlotNameFrom(
  locSeq: LabwareLocationSequence
): string | null {
  const matchingComponent = locSeq.findLast(
    locSeqComponent => locSeqComponent.kind === 'onAddressableArea'
  )

  return matchingComponent?.kind === 'onAddressableArea'
    ? matchingComponent.addressableAreaName
    : null
}

export function getLabwareDefURIFrom(
  lwId: string,
  lwUriById: AnalysisLwURIsByLwId
): string {
  const lwURI = lwUriById[lwId]

  if (lwURI == null || lwURI === '') {
    console.error(`Expected to find matching labware def for id: ${lwId}`)
    return ''
  } else {
    return lwURI
  }
}

// Returns the offset location sequence, which is used to get/store offsets from the server,
// and drive LPC UI.
export function getLwOffsetLocSeqFrom(
  locSequence: LabwareLocationSequence,
  lw: LoadedLabware[],
  modules: LoadedModule[]
): LabwareOffsetLocationSequence {
  return locSequence.reduce<LabwareOffsetLocationSequence>(
    (acc, locSeqComponent) => {
      const { kind } = locSeqComponent

      switch (kind) {
        case 'onModule': {
          const { moduleId } = locSeqComponent
          const matchingMod = modules.find(mod => mod.id === moduleId)

          return matchingMod != null
            ? [...acc, { kind, moduleModel: matchingMod.model }]
            : acc
        }
        case 'onAddressableArea': {
          return [
            ...acc,
            {
              kind,
              addressableAreaName: locSeqComponent.addressableAreaName,
            },
          ]
        }
        case 'onLabware': {
          const { labwareId } = locSeqComponent
          const matchingLw = lw.find(aLw => aLw.id === labwareId)

          return matchingLw != null
            ? [...acc, { kind, labwareUri: matchingLw.definitionUri }]
            : acc
        }
        default:
          return acc
      }
    },
    []
  )
}

// LPC cares about real modules/labware for commands and often only cares about
// modules and labware for UI purposes. Return that data to simplify LPC access.
// Note that while these data are derived from the (offset) location sequence, they are not
// synonymous with a (offset) location sequence.
export function getLwModOnlyLocSeqWithIds(
  offsetLocSeq: LabwareOffsetLocationSequence,
  locSeq: LabwareLocationSequence
): LabwareModuleOnlyStackupDetails {
  const modLwOffsetLocSeq = offsetLocSeq.filter(
    component => component.kind === 'onModule' || component.kind === 'onLabware'
  ) as Omit<LabwareModuleOnlyStackupDetails, 'id'>
  const modLwLocSeq = locSeq.filter(
    component => component.kind === 'onModule' || component.kind === 'onLabware'
  ) as Array<
    OnModuleLocationSequenceComponent | OnLabwareLocationSequenceComponent
  >

  if (modLwOffsetLocSeq.length !== modLwLocSeq.length) {
    console.error(
      'Expected offset location sequence length to be same as location sequence length but was not.'
    )
    return []
  } else {
    return modLwOffsetLocSeq.map((offsetComponent, index) => {
      const locSeqComponent = modLwLocSeq[index]

      return {
        ...offsetComponent,
        id:
          locSeqComponent.kind === 'onLabware'
            ? locSeqComponent.labwareId
            : locSeqComponent.moduleId,
      }
    })
  }
}
