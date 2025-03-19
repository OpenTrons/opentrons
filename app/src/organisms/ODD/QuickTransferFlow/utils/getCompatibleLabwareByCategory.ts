import {
  getAllDefinitions,
  LABWAREV2_DO_NOT_LIST,
} from '@opentrons/shared-data'
import {
  SINGLE_CHANNEL_COMPATIBLE_LABWARE,
  EIGHT_CHANNEL_COMPATIBLE_LABWARE,
  NINETY_SIX_CHANNEL_COMPATIBLE_LABWARE,
} from '../constants'

import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type { LabwareFilter } from '/app/local-resources/labware'

export function getCompatibleLabwareByCategory(
  pipetteChannels: 1 | 8 | 96,
  category: LabwareFilter
): LabwareDefinition2[] | undefined {
  const allLabwareDefinitions = getAllDefinitions(LABWAREV2_DO_NOT_LIST)
  let compatibleLabwareUris: string[] = SINGLE_CHANNEL_COMPATIBLE_LABWARE
  if (pipetteChannels === 8) {
    compatibleLabwareUris = EIGHT_CHANNEL_COMPATIBLE_LABWARE
  } else if (pipetteChannels === 96) {
    compatibleLabwareUris = NINETY_SIX_CHANNEL_COMPATIBLE_LABWARE
  }

  const compatibleLabwareDefinitions = compatibleLabwareUris.reduce<
    LabwareDefinition2[]
  >((acc, defUri) => {
    return [...acc, allLabwareDefinitions[defUri]]
  }, [])

  if (category === 'all') {
    return compatibleLabwareDefinitions.filter(
      def =>
        def.metadata.displayCategory === 'reservoir' ||
        def.metadata.displayCategory === 'tubeRack' ||
        def.metadata.displayCategory === 'wellPlate'
    )
  } else if (category === 'reservoir') {
    return compatibleLabwareDefinitions.filter(
      def => def.metadata.displayCategory === 'reservoir'
    )
  } else if (category === 'tubeRack') {
    return compatibleLabwareDefinitions.filter(
      def => def.metadata.displayCategory === 'tubeRack'
    )
  } else if (category === 'wellPlate') {
    return compatibleLabwareDefinitions.filter(
      def => def.metadata.displayCategory === 'wellPlate'
    )
  }
}
