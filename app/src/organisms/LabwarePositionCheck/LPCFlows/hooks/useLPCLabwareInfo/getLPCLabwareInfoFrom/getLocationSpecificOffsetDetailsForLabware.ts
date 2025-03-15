import isEqual from 'lodash/isEqual'

import { OFFSET_KIND_LOCATION_SPECIFIC } from '/app/redux/protocol-runs'
import { ANY_LOCATION } from '@opentrons/api-client'
import { getLwOffsetLocSeqFrom } from '/app/organisms/LabwarePositionCheck/LPCFlows/hooks/useLPCLabwareInfo/utils'

import type { LabwareOffsetLocationSequence } from '@opentrons/api-client'
import type {
  CompletedProtocolAnalysis,
  LoadLabwareRunTimeCommand,
} from '@opentrons/shared-data'
import type { LocationSpecificOffsetDetails } from '/app/redux/protocol-runs'
import type { GetLPCLabwareInfoForURI } from '.'

export function getLocationSpecificOffsetDetailsForLabware({
  currentOffsets,
  lwLocInfo,
  uri,
  protocolData,
}: GetLPCLabwareInfoForURI): LocationSpecificOffsetDetails[] {
  const hardCodedOffsetInfo = getHardCodedOffsetInfo(protocolData)

  return lwLocInfo
    .reduce<LocationSpecificOffsetDetails[]>((acc, comboInfo) => {
      const { definitionUri, lwOffsetLocSeq, ...restInfo } = comboInfo

      const existingOffset =
        currentOffsets.find(
          offset =>
            uri === offset.definitionUri &&
            isEqual(offset.locationSequence, comboInfo.lwOffsetLocSeq)
        ) ?? null

      const hardCodedOffsetId =
        getHardCodedOffsetId(uri, lwOffsetLocSeq, hardCodedOffsetInfo) ?? null

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
                hardCodedOffsetId,
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

type HardcodedOffsetIdAndOffsetLocSeq = [string, LabwareOffsetLocationSequence]

interface HardcodedOffsetInfo {
  [uri: string]: HardcodedOffsetIdAndOffsetLocSeq[]
}

// Returns hardcoded offset information for identifying other location-specific
// offsets.
// This logic is predicated on API level 2.18+ set_offset() behavior.
function getHardCodedOffsetInfo(
  protocolData: CompletedProtocolAnalysis | null
): HardcodedOffsetInfo {
  const result: HardcodedOffsetInfo = {}

  if (protocolData == null) {
    return result
  } else {
    const { labware } = protocolData

    labware.forEach(lw => {
      // The presence of this id means a labware offset is set using set_offset().
      const hardcodedOffsetId = lw.offsetId

      if (hardcodedOffsetId != null) {
        // This is a nested command loop, but it really should only ever iterate over
        // the initial load commands.
        const loqSeq = getHardcodedOffsetLocSeqFor(lw.id, protocolData)

        if (loqSeq.length === 0) {
          console.error(
            `Expected to find matching load command with result for hardcoded offset for labware: ${lw.id}`
          )
        }

        // Initialize the array if it doesn't exist yet
        if (!result[lw.definitionUri]) {
          result[lw.definitionUri] = []
        }

        // Now we can safely push to the initialized array
        result[lw.definitionUri].push([hardcodedOffsetId, loqSeq])
      }
    })

    return result
  }
}

// Returns the offset location sequence associated with the labware that has
// a hardcoded offset.
function getHardcodedOffsetLocSeqFor(
  lwId: string,
  protocolData: CompletedProtocolAnalysis
): LabwareOffsetLocationSequence {
  const { commands, modules, labware } = protocolData

  const matchingCommand = commands.find(c => {
    if (c.commandType === 'loadLabware' && c.result?.labwareId === lwId) {
      return true
    } else {
      return false
    }
  }) as LoadLabwareRunTimeCommand

  const loqSeq = matchingCommand.result?.locationSequence ?? []

  return getLwOffsetLocSeqFrom(loqSeq, labware, modules)
}

// Given the labware uri and offset location sequence, returns the associated
// hardcoded offset id from hardcoded offset records, if any.
function getHardCodedOffsetId(
  uri: string,
  lwOffsetLocSeq: LabwareOffsetLocationSequence | typeof ANY_LOCATION,
  hardcodedInfo: HardcodedOffsetInfo
): string | undefined {
  if (uri in hardcodedInfo) {
    const matchingInfo = hardcodedInfo[uri].find(([_, locSeq]) =>
      isEqual(locSeq, lwOffsetLocSeq)
    )

    if (matchingInfo != null) {
      return matchingInfo[0]
    }
  }
}
