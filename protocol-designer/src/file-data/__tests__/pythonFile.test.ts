import { describe, it, expect } from 'vitest'
import {
  FLEX_ROBOT_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_BLOCK_V1,
  OT2_ROBOT_TYPE,
  fixture96Plate,
  fixtureP1000SingleV2Specs,
  fixtureP300MultiV2Specs,
  fixtureTiprack1000ul,
  fixtureTiprackAdapter,
} from '@opentrons/shared-data'
import {
  getDefineLiquids,
  getLoadAdapters,
  getLoadLabware,
  getLoadLiquids,
  getLoadModules,
  getLoadPipettes,
  getLoadTrashBins,
  getLoadWasteChute,
  pythonMetadata,
  pythonRequirements,
} from '../selectors/pythonFile'
import type { LabwareDefinition2 } from '@opentrons/shared-data'
import type {
  AdditionalEquipmentEntities,
  LabwareEntities,
  LabwareLiquidState,
  LiquidEntities,
  ModuleEntities,
  PipetteEntities,
  TimelineFrame,
} from '@opentrons/step-generation'

describe('pythonMetadata', () => {
  it('should generate metadata section', () => {
    expect(
      pythonMetadata({
        protocolName: 'Name of Protocol',
        author: 'Some Author',
        description: 'The description.',
        created: 1000000000000,
        lastModified: 1000000001000,
        category: 'PCR',
        subcategory: 'PCR Prep',
        tags: ['wombat', 'kangaroo', 'wallaby'],
      })
    ).toBe(
      `
metadata = {
    "protocolName": "Name of Protocol",
    "author": "Some Author",
    "description": "The description.",
    "created": "2001-09-09T01:46:40.000Z",
    "lastModified": "2001-09-09T01:46:41.000Z",
    "category": "PCR",
    "subcategory": "PCR Prep",
    "tags": "wombat, kangaroo, wallaby",
    "protocolDesigner": "fake_PD_version",
}`.trimStart()
    )
  })
})

describe('pythonRequirements', () => {
  it('should generate requirements section', () => {
    expect(pythonRequirements(OT2_ROBOT_TYPE)).toBe(
      `
requirements = {
    "robotType": "OT-2",
    "apiLevel": "2.23",
}`.trimStart()
    )

    expect(pythonRequirements(FLEX_ROBOT_TYPE)).toBe(
      `
requirements = {
    "robotType": "Flex",
    "apiLevel": "2.23",
}`.trimStart()
    )
  })
})

const moduleId = '1'
const moduleId2 = '2'
const moduleId3 = '3'
const mockModuleEntities: ModuleEntities = {
  [moduleId]: {
    id: moduleId,
    model: MAGNETIC_BLOCK_V1,
    type: MAGNETIC_BLOCK_TYPE,
    pythonName: 'magnetic_block_1',
  },
  [moduleId2]: {
    id: moduleId2,
    model: HEATERSHAKER_MODULE_V1,
    type: HEATERSHAKER_MODULE_TYPE,
    pythonName: 'heater_shaker_1',
  },
  [moduleId3]: {
    id: moduleId3,
    model: MAGNETIC_BLOCK_V1,
    type: MAGNETIC_BLOCK_TYPE,
    pythonName: 'magnetic_block_2',
  },
}
const labwareId1 = 'labwareId1'
const labwareId2 = 'labwareId2'
const labwareId3 = 'labwareId3'
const labwareId4 = 'labwareId4'
const labwareId5 = 'labwareId5'

const mockLabwareEntities: LabwareEntities = {
  [labwareId1]: {
    id: labwareId1,
    labwareDefURI: 'fixture/fixture_flex_96_tiprack_adapter/1',
    def: fixtureTiprackAdapter as LabwareDefinition2,
    pythonName: 'adapter_1',
  },
  [labwareId2]: {
    id: labwareId2,
    labwareDefURI: 'fixture/fixture_flex_96_tiprack_adapter/1',
    def: fixtureTiprackAdapter as LabwareDefinition2,
    pythonName: 'adapter_2',
  },
  [labwareId3]: {
    id: labwareId3,
    labwareDefURI: 'fixture/fixture_96_plate/1',
    def: fixture96Plate as LabwareDefinition2,
    pythonName: 'well_plate_1',
  },
  [labwareId4]: {
    id: labwareId4,
    labwareDefURI: 'fixture/fixture_96_plate/1',
    def: fixture96Plate as LabwareDefinition2,
    pythonName: 'well_plate_2',
  },
  [labwareId5]: {
    id: labwareId5,
    labwareDefURI: 'fixture/fixture_96_plate/1',
    def: fixture96Plate as LabwareDefinition2,
    pythonName: 'well_plate_3',
  },
}

const labwareRobotState: TimelineFrame['labware'] = {
  //  adapter on a module
  [labwareId1]: { slot: moduleId },
  //  adapter on a slot
  [labwareId2]: { slot: 'B2' },
  //  labware on an adapter on a slot
  [labwareId3]: { slot: labwareId2 },
  //  labware on a module
  [labwareId4]: { slot: moduleId3 },
  //  labware on a slot
  [labwareId5]: { slot: 'C2' },
}

const mockLabwareNicknames: Record<string, string> = {
  [labwareId1]: fixtureTiprackAdapter.metadata.displayName,
  [labwareId2]: fixtureTiprackAdapter.metadata.displayName,
  [labwareId3]: 'reagent plate',
  [labwareId4]: fixture96Plate.metadata.displayName,
  [labwareId5]: 'sample plate',
}
describe('getLoadModules', () => {
  it('should generate loadModules', () => {
    const modules: TimelineFrame['modules'] = {
      [moduleId]: { slot: 'B1', moduleState: {} as any },
      [moduleId2]: { slot: 'A1', moduleState: {} as any },
      [moduleId3]: { slot: 'A2', moduleState: {} as any },
    }

    expect(getLoadModules(mockModuleEntities, modules)).toBe(
      `
# Load Modules:
magnetic_block_1 = protocol.load_module("magneticBlockV1", "B1")
heater_shaker_1 = protocol.load_module("heaterShakerModuleV1", "A1")
magnetic_block_2 = protocol.load_module("magneticBlockV1", "A2")`.trimStart()
    )
  })
})

describe('getLoadAdapters', () => {
  it('should generate loadAdapters for 2 adapters', () => {
    expect(
      getLoadAdapters(
        mockModuleEntities,
        mockLabwareEntities,
        labwareRobotState
      )
    ).toBe(
      `
# Load Adapters:
adapter_1 = magnetic_block_1.load_adapter(
    "fixture_flex_96_tiprack_adapter",
    namespace="fixture",
    version=1,
)
adapter_2 = protocol.load_adapter(
    "fixture_flex_96_tiprack_adapter",
    "B2",
    namespace="fixture",
    version=1,
)`.trimStart()
    )
  })
})

describe('getLoadLabware', () => {
  it('should generate loadLabware for 3 labware', () => {
    expect(
      getLoadLabware(
        mockModuleEntities,
        mockLabwareEntities,
        labwareRobotState,
        mockLabwareNicknames
      )
    ).toBe(
      `
# Load Labware:
well_plate_1 = adapter_2.load_labware(
    "fixture_96_plate",
    label="reagent plate",
    namespace="fixture",
    version=1,
)
well_plate_2 = magnetic_block_2.load_labware(
    "fixture_96_plate",
    namespace="fixture",
    version=1,
)
well_plate_3 = protocol.load_labware(
    "fixture_96_plate",
    "C2",
    label="sample plate",
    namespace="fixture",
    version=1,
)`.trimStart()
    )
  })
})

describe('getLoadPipettes', () => {
  it('should generate loadPipette for 2 pipettes using the same tiprack', () => {
    const mockTiprackDefURI = 'fixture/fixture_flex_96_tiprack_1000ul/1'
    const tiprack1 = 'tiprack1'
    const pipette1 = 'pipette1'
    const pipette2 = 'pipette2'
    const mockPipetteEntities: PipetteEntities = {
      [pipette1]: {
        id: pipette1,
        pythonName: 'pipette_left',
        name: 'p300_multi_gen2',
        tiprackDefURI: [mockTiprackDefURI],
        spec: fixtureP300MultiV2Specs,
        tiprackLabwareDef: [fixtureTiprack1000ul as LabwareDefinition2],
      },
      [pipette2]: {
        id: pipette2,
        pythonName: 'pipette_left',
        name: 'p1000_single_flex',
        tiprackDefURI: [mockTiprackDefURI],
        spec: fixtureP1000SingleV2Specs,
        tiprackLabwareDef: [fixtureTiprack1000ul as LabwareDefinition2],
      },
    }
    const mockTiprackEntities: LabwareEntities = {
      [tiprack1]: {
        id: tiprack1,
        def: fixtureTiprack1000ul as LabwareDefinition2,
        labwareDefURI: mockTiprackDefURI,
        pythonName: 'tip_rack_1',
      },
    }
    const pipetteRobotState: TimelineFrame['pipettes'] = {
      [pipette1]: { mount: 'left' },
      [pipette2]: { mount: 'right' },
    }

    expect(
      getLoadPipettes(
        mockPipetteEntities,
        mockTiprackEntities,
        pipetteRobotState
      )
    ).toBe(
      `
# Load Pipettes:
pipette_left = protocol.load_instrument("p300_multi_gen2", "left", tip_racks=[tip_rack_1])
pipette_left = protocol.load_instrument("flex_1channel_1000", "right", tip_racks=[tip_rack_1])`.trimStart()
    )
  })

  it('should generate loadPipette for 1 pipette with no tiprack', () => {
    const pipette1 = 'pipette1'
    const mockPipetteEntities: PipetteEntities = {
      [pipette1]: {
        id: pipette1,
        pythonName: 'pipette_left',
        name: 'p300_multi_gen2',
        tiprackDefURI: [],
        spec: fixtureP300MultiV2Specs,
        tiprackLabwareDef: [],
      },
    }
    const mockTiprackEntities: LabwareEntities = {}
    const pipetteRobotState: TimelineFrame['pipettes'] = {
      [pipette1]: { mount: 'left' },
    }

    expect(
      getLoadPipettes(
        mockPipetteEntities,
        mockTiprackEntities,
        pipetteRobotState
      )
    ).toBe(
      `
# Load Pipettes:
pipette_left = protocol.load_instrument("p300_multi_gen2", "left")`.trimStart()
    )
  })

  it('should generate loadPipette for 96-channel pipette with no tiprack', () => {
    const pipette1 = 'pipette1'
    const mockPipetteEntities: PipetteEntities = {
      [pipette1]: {
        id: pipette1,
        pythonName: 'pipette',
        name: 'p1000_96',
        tiprackDefURI: [],
        spec: { ...fixtureP1000SingleV2Specs, channels: 96 },
        tiprackLabwareDef: [],
      },
    }

    const mockTiprackEntities: LabwareEntities = {}
    const pipetteRobotState: TimelineFrame['pipettes'] = {
      [pipette1]: { mount: 'left' },
    }

    expect(
      getLoadPipettes(
        mockPipetteEntities,
        mockTiprackEntities,
        pipetteRobotState
      )
    ).toBe(
      `
# Load Pipettes:
pipette = protocol.load_instrument("flex_96channel_1000")`.trimStart()
    )
  })
})

const liquid1 = 'liquid1'
const liquid2 = 'liquid2'
const mockLiquidEntities: LiquidEntities = {
  [liquid1]: {
    liquidGroupId: liquid1,
    pythonName: 'liquid_1',
    displayName: 'water',
    description: 'mock description',
    displayColor: 'mock display color',
  },
  [liquid2]: {
    liquidGroupId: liquid2,
    pythonName: 'liquid_2',
    description: '',
    displayName: 'sulfur',
    displayColor: 'mock display color 2',
  },
}

describe('getDefineLiquids', () => {
  it('should generate 2 liquids, 1 with description, 1 without', () => {
    expect(getDefineLiquids(mockLiquidEntities)).toBe(
      `
# Define Liquids:
liquid_1 = protocol.define_liquid(
    "water",
    description="mock description",
    display_color="mock display color",
)
liquid_2 = protocol.define_liquid(
    "sulfur",
    display_color="mock display color 2",
)`.trimStart()
    )
  })
})

describe('getLoadLiquids', () => {
  it('should generate 2 liquids in 2 labware in 4 wells', () => {
    const mockLiquidsBylabwareId: LabwareLiquidState = {
      [labwareId3]: {
        A1: { [liquid1]: { volume: 10 } },
        A2: { [liquid1]: { volume: 10 } },
        A3: { [liquid2]: { volume: 50 } },
      },
      [labwareId4]: {
        D1: { [liquid2]: { volume: 180 } },
      },
    }
    expect(
      getLoadLiquids(
        mockLiquidsBylabwareId,
        mockLiquidEntities,
        mockLabwareEntities
      )
    ).toBe(
      `
# Load Liquids:
well_plate_1["A1"].load_liquid(liquid_1, 10)
well_plate_1["A2"].load_liquid(liquid_1, 10)
well_plate_1["A3"].load_liquid(liquid_2, 50)
well_plate_2["D1"].load_liquid(liquid_2, 180)`.trimStart()
    )
  })
})

const trash1 = 'trash1'
const trash2 = 'trash2'
const wasteChute = 'wasteChute'
const mockAdditionalEquipmentEntities: AdditionalEquipmentEntities = {
  [trash1]: {
    name: 'trashBin',
    pythonName: 'trash_bin_1',
    location: 'A3',
    id: trash1,
  },
  [trash2]: {
    name: 'trashBin',
    pythonName: 'trash_bin_2',
    location: 'C3',
    id: trash2,
  },
  [wasteChute]: {
    name: 'wasteChute',
    pythonName: 'waste_chute',
    location: 'D3',
    id: wasteChute,
  },
}

describe('getTrashBins', () => {
  it('should generate 2 trash bins', () => {
    expect(getLoadTrashBins(mockAdditionalEquipmentEntities)).toBe(
      `
# Load Trash Bins:
trash_bin_1 = protocol.load_trash_bin("A3")
trash_bin_2 = protocol.load_trash_bin("C3")`.trimStart()
    )
  })
})

describe('getLoadWasteChute', () => {
  it('should generate a waste chute', () => {
    expect(getLoadWasteChute(mockAdditionalEquipmentEntities)).toBe(
      `
# Load Waste Chute:
waste_chute = protocol.load_waste_chute()`.trimStart()
    )
  })
})
