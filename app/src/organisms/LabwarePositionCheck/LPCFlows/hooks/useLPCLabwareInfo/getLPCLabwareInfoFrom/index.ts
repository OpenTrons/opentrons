import type {
  CompletedProtocolAnalysis,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import { getLabwareDefURI, getLabwareDisplayName } from '@opentrons/shared-data'

import { getLocationSpecificOffsetDetailsForLabware } from './getLocationSpecificOffsetDetailsForLabware'
import { getDefaultOffsetDetailsForLabware } from './getDefaultOffsetForLabware'
import {
  getTotalCountNonHardCodedLocationSpecificOffsets,
  OFFSETS_SOURCE_INITIALIZING,
} from '/app/redux/protocol-runs'
import type { UseLPCLabwareInfoProps } from '..'
import type { StoredLabwareOffset } from '@opentrons/api-client'
import type {
  LabwareLocationInfo,
  LPCLabwareInfo,
} from '/app/redux/protocol-runs'

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
    initialRunRecordOffsets: [],
    initialDatabaseOffsets: [],
    conflictTimestampInfo: { timestamp: null, isInitialized: false },
    sourcedOffsets: OFFSETS_SOURCE_INITIALIZING,
  }
}

function getLabwareInfoRecords(
  params: GetLPCLabwareInfoParams
): LPCLabwareInfo['labware'] {
  const labwareDetails: LPCLabwareInfo['labware'] = {}

  params.lwLocInfo.forEach(combo => {
    const uri = combo.definitionUri
    const locationSpecificOffsetDetails = getLocationSpecificOffsetDetailsForLabware(
      {
        ...params,
        uri,
      }
    )

    if (!(uri in labwareDetails)) {
      labwareDetails[uri] = {
        id: getALabwareIdFromUri({ ...params, uri }),
        displayName: getDisplayNameFromUri({ ...params, uri }),
        defaultOffsetDetails: getDefaultOffsetDetailsForLabware({
          ...params,
          uri,
          locationSpecificOffsetDetails,
        }),
        locationSpecificOffsetDetails,
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
