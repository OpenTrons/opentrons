import { ANY_LOCATION } from '@opentrons/api-client'
import { getLabwareDefURI } from '@opentrons/shared-data'

import { OFFSET_KIND_DEFAULT } from '/app/redux/protocol-runs'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
  LabwareModuleStackupDetails,
} from '/app/redux/protocol-runs'
import type { GetLPCLabwareInfoForURI } from '.'

interface GetDefaultOffsetDetailsForLabwareParams
  extends GetLPCLabwareInfoForURI {
  locationSpecificOffsetDetails: LocationSpecificOffsetDetails[]
}

export function getDefaultOffsetDetailsForLabware(
  params: GetDefaultOffsetDetailsForLabwareParams
): DefaultOffsetDetails {
  const { lwLocInfo, uri, currentOffsets } = params
  const aLabwareId =
    lwLocInfo?.find(combo => combo.definitionUri === uri)?.labwareId ?? ''

  const existingOffset =
    currentOffsets?.find(
      offset =>
        offset.locationSequence === ANY_LOCATION && offset.definitionUri === uri
    ) ?? null

  const { lwModOnlyStackupDetails, closestBeneathAdapterId } = getStackupInfo({
    ...params,
    aLabwareId,
  })

  return {
    workingOffset: null,
    existingOffset,
    locationDetails: {
      labwareId: aLabwareId,
      definitionUri: uri,
      kind: OFFSET_KIND_DEFAULT,
      // We always do default offset LPCing in this slot.
      addressableAreaName: 'C2',
      lwOffsetLocSeq: ANY_LOCATION,
      closestBeneathAdapterId,
      // The only labware present on deck when configuring the default offset is the top-most labware itself.
      lwModOnlyStackupDetails,
    },
  }
}

interface GetStackingInfoParams
  extends GetDefaultOffsetDetailsForLabwareParams {
  aLabwareId: string
}

// Certain labware must be part of a stackup unconditionally (as noted by the 'stackingOnly' quirk),
// and cannot be placed directly on the deck as the sole labware when setting a default offset (ex, evotips).
// It must be accompanied by an adapter.
//
// In these circumstances, the default offset info should include adapter details, which the view
// layer utilizes for appropriate deck and copy rendering.
// We arbitrarily select the first adapter utilized in the run, which is also the adapter
// associated with the first location-specific offset.
function getStackupInfo({
  uri,
  labwareDefs,
  locationSpecificOffsetDetails,
  protocolData,
  aLabwareId,
}: GetStackingInfoParams): {
  lwModOnlyStackupDetails: LabwareModuleStackupDetails
  closestBeneathAdapterId: string | undefined
} {
  const requiresAdapterId = getRequiresAdapterId(uri, labwareDefs)

  const closestBeneathAdapterId = requiresAdapterId
    ? getFirstAdapterIdFrom(locationSpecificOffsetDetails)
    : undefined

  const adapterUri =
    protocolData?.labware.find(lw => lw.id === closestBeneathAdapterId)
      ?.definitionUri ?? ''

  const lwModOnlyStackupDetails: LabwareModuleStackupDetails = requiresAdapterId
    ? [
        {
          kind: 'labware',
          labwareUri: adapterUri,
          id: closestBeneathAdapterId ?? '',
        },
        { kind: 'labware', labwareUri: uri, id: aLabwareId },
      ]
    : [{ kind: 'labware', labwareUri: uri, id: aLabwareId }]

  if (
    requiresAdapterId &&
    (closestBeneathAdapterId == null || adapterUri == null)
  ) {
    console.error(
      `Expected to find required adapter for mandatory stackup for labware: ${uri}`
    )
  }

  return { lwModOnlyStackupDetails, closestBeneathAdapterId }
}

function getRequiresAdapterId(
  uri: string,
  labwareDefs: GetLPCLabwareInfoForURI['labwareDefs']
): boolean {
  const matchingDef =
    labwareDefs?.find(def => getLabwareDefURI(def) === uri) ?? null

  return requiresAdapter(matchingDef)
}

function requiresAdapter(def: LabwareDefinition2 | null): boolean {
  return def?.parameters.quirks?.includes('stackingOnly') ?? false
}

function getFirstAdapterIdFrom(
  lsOffsets: LocationSpecificOffsetDetails[]
): string | undefined {
  return lsOffsets.find(
    lsOffset => lsOffset.locationDetails.closestBeneathAdapterId != null
  )?.locationDetails.closestBeneathAdapterId
}
