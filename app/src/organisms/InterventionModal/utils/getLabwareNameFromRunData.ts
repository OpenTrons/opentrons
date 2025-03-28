import { getLabwareDefURI, getLabwareDisplayName } from '@opentrons/shared-data'
import {
  getLoadedLabware,
  getLabwareDefinitionsFromCommands,
} from '@opentrons/components'

import type { RunTimeCommand } from '@opentrons/shared-data'
import type { RunData } from '@opentrons/api-client'

const FIXED_TRASH_DEF_URIS = [
  'opentrons/opentrons_1_trash_850ml_fixed/1',
  'opentrons/opentrons_1_trash_1100ml_fixed/1',
  'opentrons/opentrons_1_trash_3200ml_fixed/1',
]
export function getLabwareNameFromRunData(
  protocolData: RunData,
  labwareId: string,
  commands: RunTimeCommand[]
): string {
  const loadedLabware = getLoadedLabware(protocolData.labware, labwareId)
  if (loadedLabware == null) {
    return ''
  } else if (FIXED_TRASH_DEF_URIS.includes(loadedLabware.definitionUri)) {
    return 'Fixed Trash'
  } else if (loadedLabware.displayName != null) {
    return loadedLabware.displayName
  } else {
    const labwareDef = getLabwareDefinitionsFromCommands(commands).find(
      def => getLabwareDefURI(def) === loadedLabware.definitionUri
    )
    return labwareDef != null ? getLabwareDisplayName(labwareDef) : ''
  }
}
