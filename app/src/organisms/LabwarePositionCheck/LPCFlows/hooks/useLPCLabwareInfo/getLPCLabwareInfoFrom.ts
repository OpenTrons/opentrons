import isEqual from 'lodash/isEqual'

import { getLabwareDisplayName, getLabwareDefURI } from '@opentrons/shared-data'
import { ANY_LOCATION } from '@opentrons/api-client'

import {
  OFFSET_KIND_DEFAULT,
  OFFSET_KIND_LOCATION_SPECIFIC,
} from '/app/redux/protocol-runs'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  DefaultOffsetDetails,
  LocationSpecificOffsetDetails,
  LPCLabwareInfo,
  LabwareLocationInfo,
} from '/app/redux/protocol-runs'
import type { UseLPCLabwareInfoProps } from '.'
import type { StoredLabwareOffset } from '@opentrons/api-client'

interface GetLPCLabwareInfoParams {
  currentOffsets: StoredLabwareOffset[]
  lwLocationCombos: LabwareLocationInfo[]
  labwareDefs: UseLPCLabwareInfoProps['labwareDefs']
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

  params.lwLocationCombos.forEach(combo => {
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

type GetLPCLabwareInfoForURI = GetLPCLabwareInfoParams & {
  uri: string
}

function getALabwareIdFromUri({
  uri,
  lwLocationCombos,
}: GetLPCLabwareInfoForURI): string {
  return (
    lwLocationCombos.find(combo => combo.definitionUri === uri)?.labwareId ?? ''
  )
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

function getLocationSpecificOffsetDetailsForLabware({
  currentOffsets,
  lwLocationCombos,
  uri,
}: GetLPCLabwareInfoForURI): LocationSpecificOffsetDetails[] {
  return lwLocationCombos
    .reduce<LocationSpecificOffsetDetails[]>((acc, comboInfo) => {
      const { definitionUri, lwOffsetLocSeq, ...restInfo } = comboInfo

      const existingOffset =
        currentOffsets.find(
          offset =>
            uri === offset.definitionUri &&
            isEqual(offset.locationSequence, comboInfo.lwOffsetLocSeq)
        ) ?? null

      return lwOffsetLocSeq !== ANY_LOCATION
        ? [
            ...acc,
            {
              existingOffset: existingOffset ?? null,
              workingOffset: null,
              locationDetails: {
                ...restInfo,
                definitionUri,
                lwOffsetLocSeq,
                // Add the top-most labware itself.
                lwModOnlyStackupDetails: [
                  ...restInfo.lwModOnlyStackupDetails,
                  {
                    kind: 'onLabware',
                    labwareUri: uri,
                    id: restInfo.labwareId,
                  },
                ],
                kind: OFFSET_KIND_LOCATION_SPECIFIC,
              },
            },
          ]
        : acc
    }, [])
    .filter(detail => detail.locationDetails.definitionUri === uri)
}

function getDefaultOffsetDetailsForLabware({
  currentOffsets,
  lwLocationCombos,
  uri,
}: GetLPCLabwareInfoForURI): DefaultOffsetDetails {
  const aLabwareId =
    lwLocationCombos?.find(combo => combo.definitionUri === uri)?.labwareId ??
    ''

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
      slotName: 'C2',
      lwOffsetLocSeq: ANY_LOCATION,
      // The only labware present on deck when configuring the default offset is the top-most labware itself.
      lwModOnlyStackupDetails: [
        { kind: 'onLabware', labwareUri: uri, id: aLabwareId },
      ],
    },
  }
}
