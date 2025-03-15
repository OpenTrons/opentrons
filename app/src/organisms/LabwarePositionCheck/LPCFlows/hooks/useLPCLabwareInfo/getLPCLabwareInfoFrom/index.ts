import { getLabwareDisplayName, getLabwareDefURI } from '@opentrons/shared-data'

import { getLocationSpecificOffsetDetailsForLabware } from './getLocationSpecificOffsetDetailsForLabware'
import { getDefaultOffsetDetailsForLabware } from './getDefaultOffsetForLabware'

import type {
  LabwareDefinition2,
  CompletedProtocolAnalysis,
} from '@opentrons/shared-data'
import type {
  LPCLabwareInfo,
  LabwareLocationInfo,
} from '/app/redux/protocol-runs'
import type { UseLPCLabwareInfoProps } from '..'
import type { StoredLabwareOffset } from '@opentrons/api-client'

interface GetLPCLabwareInfoParams {
  currentOffsets: StoredLabwareOffset[]
  lwLocInfo: LabwareLocationInfo[]
  labwareDefs: UseLPCLabwareInfoProps['labwareDefs']
  protocolData: CompletedProtocolAnalysis | null
}

// Prepare data for injection into LPC.
export function getLPCLabwareInfoFrom(
  params: GetLPCLabwareInfoParams
): LPCLabwareInfo {
  return { selectedLabware: null, labware: getLabwareInfoRecords(params) }
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
