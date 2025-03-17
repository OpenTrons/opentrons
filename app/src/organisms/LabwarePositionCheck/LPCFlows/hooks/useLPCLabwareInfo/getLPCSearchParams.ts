import { ANY_LOCATION } from '@opentrons/api-client'

import type { SearchLabwareOffsetsData } from '@opentrons/api-client'
import type { LabwareLocationInfo } from '/app/redux/protocol-runs'

// For location combos that require LPC consideration, prepare params for searching
// for the existing offsets for those location combos.
export function getLPCSearchParams(
  lwLocCombos: LabwareLocationInfo[]
): SearchLabwareOffsetsData {
  const locationSpecificOffsetSearchData = lwLocCombos.map(combo => ({
    definitionUri: combo.definitionUri,
    locationSequence: combo.lwOffsetLocSeq,
    mostRecentOnly: true,
  }))

  const defaultOffsetSearchData = lwLocCombos.map(combo => ({
    definitionUri: combo.definitionUri,
    locationSequence: ANY_LOCATION,
    mostRecentOnly: true,
  }))

  return {
    filters: [...defaultOffsetSearchData, ...locationSpecificOffsetSearchData],
  }
}
