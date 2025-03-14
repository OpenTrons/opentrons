import type {
  LabwareOffsetLocationSequence,
  OnAddressableAreaOffsetLocationSequenceComponent,
  OnLabwareOffsetLocationSequenceComponent,
  OnModuleOffsetLocationSequenceComponent,
} from '@opentrons/api-client'
import type { LoadedLabware } from '@opentrons/shared-data'
import type { LegacyLabwareLocationCombo } from '/app/organisms/LegacyApplyHistoricOffsets/hooks/getLegacyLabwareLocationCombos'
import type {
  LabwareLocationInfo,
  LabwareModuleOnlyStackupDetails,
} from '/app/redux/protocol-runs'

export function getLabwareLocationInfoFrom(
  legacyCombos: LegacyLabwareLocationCombo[],
  labware: LoadedLabware[]
): LabwareLocationInfo[] {
  return legacyCombos.map(legacyCombo => {
    const lwOffsetLocSeq = buildLwOffsetLocSeq(legacyCombo, labware)

    return {
      definitionUri: legacyCombo.definitionUri,
      labwareId: legacyCombo.labwareId,
      slotName: legacyCombo.location.slotName,
      lwOffsetLocSeq,
      lwModOnlyStackupDetails: buildLwModOnlyStackupDetails(
        legacyCombo,
        lwOffsetLocSeq
      ),
      closestBeneathModuleId: legacyCombo.moduleId,
      closestBeneathModuleModel: legacyCombo.location.moduleModel,
      closestBeneathAdapterId: legacyCombo.adapterId,
    }
  })
}

// Protocol analyses from this period do not have stack-ups other than permutations
// between the LPC-able labware, an adapter, and a module.
function buildLwOffsetLocSeq(
  legacyCombo: LegacyLabwareLocationCombo,
  labware: LoadedLabware[]
): LabwareOffsetLocationSequence {
  const locSeq: LabwareOffsetLocationSequence = []

  // The offset location sequence always starts with an addressable area.
  locSeq.push(buildAAOffsetLocSeq(legacyCombo))

  if (legacyCombo.moduleId != null) {
    locSeq.push(buildModuleOffsetLocSeq(legacyCombo))
  }

  if (legacyCombo.adapterId != null) {
    locSeq.push(buildAdapterOffsetLocSeq(legacyCombo, labware))
  }

  return locSeq
}

function buildAAOffsetLocSeq(
  legacyCombo: LegacyLabwareLocationCombo
): OnAddressableAreaOffsetLocationSequenceComponent {
  const { moduleModel, slotName } = legacyCombo.location

  if (moduleModel != null) {
    return {
      kind: 'onAddressableArea',
      addressableAreaName: `${moduleModel}${slotName}`,
    }
  } else {
    return { kind: 'onAddressableArea', addressableAreaName: slotName }
  }
}

function buildModuleOffsetLocSeq(
  legacyCombo: LegacyLabwareLocationCombo
): OnModuleOffsetLocationSequenceComponent {
  const { moduleModel } = legacyCombo.location

  if (moduleModel == null) {
    console.error('Expected to find module model but did not.')
  }

  return { kind: 'onModule', moduleModel: moduleModel ?? 'magneticBlockV1' }
}

function buildAdapterOffsetLocSeq(
  legacyCombo: LegacyLabwareLocationCombo,
  labware: LoadedLabware[]
): OnLabwareOffsetLocationSequenceComponent {
  const selectedLwUri = labware.find(lw => lw.id === legacyCombo.adapterId)
  if (selectedLwUri == null) {
    console.error('Expected to find adapter uri but did not.')
  }

  return { kind: 'onLabware', labwareUri: selectedLwUri?.definitionUri ?? '' }
}

function buildLwModOnlyStackupDetails(
  legacyCombo: LegacyLabwareLocationCombo,
  offsetLocSeq: LabwareOffsetLocationSequence
): LabwareModuleOnlyStackupDetails {
  const lwModOnly = offsetLocSeq.filter(
    component => component.kind === 'onLabware' || component.kind === 'onModule'
  ) as Omit<LabwareModuleOnlyStackupDetails, 'id'>

  return lwModOnly.map((component, idx) => {
    // This is safe, since we know that the top-most labware MUST be the labware
    // and the only other labware beneath that must be the adapter.
    const lwId =
      idx === lwModOnly.length - 1
        ? legacyCombo.labwareId
        : legacyCombo.adapterId ?? ''

    return {
      ...component,
      id: component.kind === 'onModule' ? legacyCombo.moduleId ?? '' : lwId,
    }
  })
}
