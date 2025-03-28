// Named arguments to createFile selector. This data would be the result of several selectors.
import {
  fixture_96_plate,
  fixture_tiprack_10_ul,
  fixture_trash,
} from '@opentrons/shared-data/labware/fixtures/2'
import { fixtureP10SingleV2Specs } from '@opentrons/shared-data'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  LabwareLiquidState,
  LabwareEntities,
  PipetteEntities,
} from '@opentrons/step-generation'
import type { DismissedWarningState } from '../../../dismiss/reducers'
import type { IngredientsState } from '../../../labware-ingred/reducers'
import type { LabwareDefByDefURI } from '../../../labware-defs'
import type { FileMetadataFields } from '../../types'

const fixture96Plate = fixture_96_plate as LabwareDefinition2
const fixtureTiprack10ul = fixture_tiprack_10_ul as LabwareDefinition2
const fixtureTrash = fixture_trash as LabwareDefinition2
export const fileMetadata: FileMetadataFields = {
  protocolName: 'Test Protocol',
  author: 'The Author',
  description: 'Protocol description',
  created: 1582667312515,
  source: 'Protocol Designer',
}
export const dismissedWarnings: DismissedWarningState = {
  form: [],
  timeline: [],
}
export const ingredients: IngredientsState = {}
export const ingredLocations: LabwareLiquidState = {}
export const labwareEntities: LabwareEntities = {
  fixedTrash: {
    labwareDefURI: 'opentrons/opentrons_1_trash_1100ml_fixed/1',
    id: 'fixedTrash',
    def: fixtureTrash,
    pythonName: 'mock_python_name_1',
  },
  tiprackId: {
    labwareDefURI: 'opentrons/opentrons_96_tiprack_10ul/1',
    id: 'tiprackId',
    def: fixtureTiprack10ul,
    pythonName: 'mock_python_name_2',
  },
  plateId: {
    labwareDefURI: 'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
    id: 'plateId',
    def: fixture96Plate,
    pythonName: 'mock_python_name_3',
  },
}
export const pipetteEntities: PipetteEntities = {
  pipetteId: {
    id: 'pipetteId',
    name: 'p10_single',
    spec: fixtureP10SingleV2Specs,
    tiprackDefURI: ['opentrons/opentrons_96_tiprack_10ul/1'],
    tiprackLabwareDef: [fixtureTiprack10ul],
    pythonName: 'mock_python_name_1',
  },
}
export const labwareNicknamesById: Record<string, string> = {
  fixedTrash: 'Trash',
  tiprackId: 'Opentrons 96 Tip Rack 10 µL',
  plateId: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
}
export const labwareDefsByURI: LabwareDefByDefURI = {
  'opentrons/opentrons_96_tiprack_10ul/1': fixtureTiprack10ul,
  'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1': fixture96Plate,
  'opentrons/opentrons_1_trash_1100ml_fixed/1': fixtureTrash,
}
