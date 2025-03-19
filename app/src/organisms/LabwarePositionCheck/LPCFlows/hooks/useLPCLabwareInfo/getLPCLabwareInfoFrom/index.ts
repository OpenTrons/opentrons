import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import { getLabwareDefURI, getLabwareDisplayName } from '@opentrons/shared-data'

import { getLocationSpecificOffsetDetailsForLabware } from './getLocationSpecificOffsetDetailsForLabware'
import { getDefaultOffsetDetailsForLabware } from './getDefaultOffsetForLabware'
import type {
  LabwareLocationInfo,
  LPCLabwareInfo,
} from '/app/redux/protocol-runs'
import {
  getTotalCountNonHardCodedLocationSpecificOffsets,
  OFFSETS_FROM_DATABASE,
} from '/app/redux/protocol-runs'
import type { UseLPCLabwareInfoProps } from '..'
import type { StoredLabwareOffset } from '@opentrons/api-client'

interface GetLPCLabwareInfoParams {
  currentOffsets: StoredLabwareOffset[] | undefined
  lwLocInfo: LabwareLocationInfo[]
  labwareDefs: UseLPCLabwareInfoProps['labwareDefs']
  protocolData: CompletedProtocolAnalysis | null
}

// Prepare data for injection into LPC.
export function getLPCLabwareInfoFrom(
  params: GetLPCLabwareInfoParams
): LPCLabwareInfo {
  const labware = getLabwareInfoRecords(params)
  // If the run contains no LPC-able labware, mark offsets as applied.
  const areOffsetsApplied =
    getTotalCountNonHardCodedLocationSpecificOffsets(labware) === 0

  return {
    areOffsetsApplied,
    selectedLabware: null,
    labware,
    lastFreshOffsetRunTimestamp: null,
    sourcedOffsets: OFFSETS_FROM_DATABASE,
  }
}

function getLabwareInfoRecords(
  params: GetLPCLabwareInfoParams
): LPCLabwareInfo['labware'] {
  const labwareDetails: LPCLabwareInfo['labware'] = {}

  params.lwLocInfo.forEach(combo => {
    const uri = combo.definitionUri

    if (!(uri in labwareDetails)) {
      labwareDetails[uri] = {
        id: getALabwareIdFromUri({ ...params, uri }),
        displayName: getDisplayNameFromUri({ ...params, uri }),
        defaultOffsetDetails: getDefaultOffsetDetailsForLabware({
          ...params,
          uri,
        }),
        locationSpecificOffsetDetails: getLocationSpecificOffsetDetailsForLabware(
          {
            ...params,
            uri,
          }
        ),
      }
    }
  })

  return labwareDetails
}

export type GetLPCLabwareInfoForURI = GetLPCLabwareInfoParams & {
  uri: string
}

function getALabwareIdFromUri({
  uri,
  lwLocInfo,
}: GetLPCLabwareInfoForURI): string {
  return lwLocInfo.find(combo => combo.definitionUri === uri)?.labwareId ?? ''
}

function getDisplayNameFromUri({
  uri,
  labwareDefs,
}: GetLPCLabwareInfoForURI): string {
  const matchedDef = labwareDefs?.find(
    def => getLabwareDefURI(def) === uri
  ) as LabwareDefinition2

  if (!!!matchedDef) {
    console.warn(
      `Could not get labware def for uri ${uri} from list of defs with uri ${
        labwareDefs?.map(getLabwareDefURI) ?? '<no list provided>'
      }`
    )
  }

  return getLabwareDisplayName(matchedDef)
}
