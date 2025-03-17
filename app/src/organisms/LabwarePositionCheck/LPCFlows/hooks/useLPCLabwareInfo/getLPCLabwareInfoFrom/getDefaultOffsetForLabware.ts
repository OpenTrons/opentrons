import { ANY_LOCATION } from '@opentrons/api-client'

import { OFFSET_KIND_DEFAULT } from '/app/redux/protocol-runs'

import type { DefaultOffsetDetails } from '/app/redux/protocol-runs'
import type { GetLPCLabwareInfoForURI } from '.'

export function getDefaultOffsetDetailsForLabware({
  currentOffsets,
  lwLocInfo,
  uri,
}: GetLPCLabwareInfoForURI): DefaultOffsetDetails {
  const aLabwareId =
    lwLocInfo?.find(combo => combo.definitionUri === uri)?.labwareId ?? ''

  const existingOffset =
    currentOffsets.find(
      offset =>
        offset.locationSequence === ANY_LOCATION && offset.definitionUri === uri
    ) ?? null

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
      // The only labware present on deck when configuring the default offset is the top-most labware itself.
      lwModOnlyStackupDetails: [
        { kind: 'onLabware', labwareUri: uri, id: aLabwareId },
      ],
    },
  }
}
