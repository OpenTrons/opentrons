import type {
  FlexAddressableAreaName,
  LabwareLocationSequence,
  LoadedModule,
  ModuleModel,
  OnLabwareLocationSequenceComponent,
  OnModuleLocationSequenceComponent,
} from '@opentrons/shared-data'
import type { LabwareOffsetLocationSequence } from '@opentrons/api-client'
import type { AnalysisLwURIsByLwId } from './getAllPossibleLwURIsInRun'
import type {
  LabwareModuleStackupDetail,
  LabwareModuleStackupDetails,
} from '/app/redux/protocol-runs'

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
export function getAddressableAreaNameFrom(
  locSeq: LabwareLocationSequence
): FlexAddressableAreaName | null {
  const matchingComponent = locSeq.findLast(
    locSeqComponent => locSeqComponent.kind === 'onAddressableArea'
  )

  return matchingComponent?.kind === 'onAddressableArea'
    ? (matchingComponent.addressableAreaName as FlexAddressableAreaName)
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

type WorkingLwModStackupDetails = Omit<LabwareModuleStackupDetail, 'id'>

// LPC cares about real modules/labware for commands and often only cares about
// modules and labware for UI purposes. Return that data to simplify LPC access.
// Note that while these data are derived from the (offset) location sequence, they are not
// synonymous with a (offset) location sequence. They are REVERSE SORTED, so the
// lowest most item in the stackup is returned first.
export function getLwModStackupDetails(
  offsetLocSeq: LabwareOffsetLocationSequence,
  locSeq: LabwareLocationSequence,
  topLwId: string,
  topLwUri: string
): LabwareModuleStackupDetails {
  const modLwOffsetLocSeq = offsetLocSeq.reduce<WorkingLwModStackupDetails[]>(
    (acc, seq) => {
      if (seq.kind === 'onModule') {
        return [...acc, { kind: 'module', moduleModel: seq.moduleModel }]
      } else if (seq.kind === 'onLabware') {
        return [...acc, { kind: 'labware', labwareUri: seq.labwareUri }]
      } else {
        return acc
      }
    },
    []
  )
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
    const topBottomOffsets = modLwOffsetLocSeq.map((offsetComponent, index) => {
      const locSeqComponent = modLwLocSeq[index]

      return {
        ...offsetComponent,
        id:
          locSeqComponent.kind === 'onLabware'
            ? locSeqComponent.labwareId
            : locSeqComponent.moduleId,
      }
    }) as LabwareModuleStackupDetails

    return [
      ...topBottomOffsets.reverse(),
      // Add the top-most labware.
      { kind: 'labware', labwareUri: topLwUri, id: topLwId },
    ]
  }
}
