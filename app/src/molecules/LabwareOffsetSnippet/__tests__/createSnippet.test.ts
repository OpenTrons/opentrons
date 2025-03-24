import { describe, it, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { OT2_ROBOT_TYPE, transfer_settings } from '@opentrons/shared-data'
import { createSnippet } from '../createSnippet'
import type {
  ModuleModel,
  CompletedProtocolAnalysis,
} from '@opentrons/shared-data'

const protocolWithMagTempTC = ({
  ...transfer_settings,
  labware: [
    {
      id: 'fixedTrash',
      loadName: 'opentrons_1_trash_1100ml_fixed',
      displayName: 'Trash',
      definitionUri: 'opentrons/opentrons_1_trash_1100ml_fixed/1',
    },
    {
      id:
        '3e047fb0-3412-11eb-ad93-ed232a2337cf:opentrons/opentrons_96_tiprack_1000ul/1',
      displayName: 'Opentrons 96 Tip Rack 1000 µL',
      loadName: 'opentrons_96_tiprack_1000ul',
      definitionUri: 'opentrons/opentrons_96_tiprack_1000ul/1',
    },
    {
      id:
        '5ae317e0-3412-11eb-ad93-ed232a2337cf:opentrons/nest_1_reservoir_195ml/1',
      displayName: 'NEST 1 Well Reservoir 195 mL',
      definitionUri: 'opentrons/nest_1_reservoir_195ml/1',
      loadName: 'nest_1_reservoir_195ml',
    },
    {
      id:
        '60e8b050-3412-11eb-ad93-ed232a2337cf:opentrons/corning_24_wellplate_3.4ml_flat/1',
      displayName: 'Corning 24 Well Plate 3.4 mL Flat',
      definitionUri: 'opentrons/corning_24_wellplate_3.4ml_flat/1',
      loadName: 'corning_24_wellplate_3.4ml_flat',
    },
    {
      id:
        'aac5d680-3412-11eb-ad93-ed232a2337cf:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
      displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
      definitionUri: 'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
      loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
    },
    {
      id:
        'ada13110-3412-11eb-ad93-ed232a2337cf:opentrons/opentrons_96_aluminumblock_generic_pcr_strip_200ul/1',
      displayName:
        'Opentrons 96 Well Aluminum Block with Generic PCR Strip 200 µL',
      definitionUri:
        'opentrons/opentrons_96_aluminumblock_generic_pcr_strip_200ul/1',
      loadName: 'opentrons_96_aluminumblock_generic_pcr_strip_200ul',
    },
    {
      id:
        'b0103540-3412-11eb-ad93-ed232a2337cf:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
      displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt (1)',
      definitionUri: 'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
      loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
    },
    {
      id:
        'faa13a50-a9bf-11eb-bce6-9f1d5b9c1a1b:opentrons/opentrons_96_tiprack_20ul/1',
      displayName: 'Opentrons 96 Tip Rack 20 µL',
      definitionUri: 'opentrons/opentrons_96_tiprack_20ul/1',
      loadName: 'opentrons_96_tiprack_20ul',
    },
    {
      id: '53d3b350-a9c0-11eb-bce6-9f1d5b9c1a1b',
      displayName: 'Corning 24 Well Plate 3.4 mL Flat (1)',
      definitionUri: 'opentrons/corning_24_wellplate_3.4ml_flat/1',
      loadName: 'corning_24_wellplate_3.4ml_flat',
    },
  ],
  modules: [
    {
      id: '3e012450-3412-11eb-ad93-ed232a2337cf:magneticModuleType',
      model: 'magneticModuleV2',
      location: {
        slotName: '1',
      },
    },
    {
      id: '3e0283e0-3412-11eb-ad93-ed232a2337cf:temperatureModuleType',
      model: 'temperatureModuleV2',
      location: {
        slotName: '3',
      },
    },
    {
      id: '3e039550-3412-11eb-ad93-ed232a2337cf:thermocyclerModuleType',
      model: 'thermocyclerModuleV1',
      location: {
        slotName: '7',
      },
    },
  ],
} as unknown) as CompletedProtocolAnalysis

// module ids come from the fixture protocol, they are just here for readability
const TIPRACK_DEF_URI = 'opentrons/opentrons_96_tiprack_1000ul/1'
const TC_PLATE_DEF_URI = 'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1'
const SLOT_PLATE_DEF_URI = 'opentrons/corning_24_wellplate_3.4ml_flat/1'

const labwareOffsets = [
  {
    id: 'offset_for_tiprack',
    createdAt: 'fake_timestamp',
    definitionUri: TIPRACK_DEF_URI,
    location: { slotName: '2' },
    vector: { x: 1, y: 0, z: 0 },
  },
  {
    id: 'offset_for_lw_on_module',
    createdAt: 'fake_timestamp',
    definitionUri: TC_PLATE_DEF_URI,
    location: {
      slotName: '7',
      moduleModel: 'thermocyclerModuleV1' as ModuleModel,
    },
    vector: { x: 0, y: 2, z: 0 },
  },
  {
    id: 'offset_for_lw_on_deck',
    createdAt: 'fake_timestamp',
    definitionUri: SLOT_PLATE_DEF_URI,
    location: { slotName: '6' },
    vector: { x: 0, y: 0, z: 2.99999 },
  },
]
const analysisCommands = protocolWithMagTempTC.commands.map(c => {
  if (c.commandType === 'loadModule') {
    return {
      ...c,
      params: {
        ...c.params,
        model: protocolWithMagTempTC.modules.find(
          m => m.id === c.params.moduleId
        )?.model as ModuleModel,
      },
    }
  }
  return c
})

const jupyterPrefix =
  'import opentrons.execute\nprotocol = opentrons.execute.get_protocol_api("2.18")\n\n'
const cliPrefix =
  'from opentrons import protocol_api\n\nmetadata = {\n    "apiLevel": "2.18"\n}\n\ndef run(protocol: protocol_api.ProtocolContext):'

describe('createSnippet', () => {
  it('should generate expected python snippet for jupyter rounding vector values to 2 fixed decimal values', () => {
    const tipRackLoadAndOffset =
      'labware_2 = protocol.load_labware("opentrons_96_tiprack_1000ul", location="2")\nlabware_2.set_offset(x=1.00, y=0.00, z=0.00)'
    const tcPlateLoadAndOffset =
      'labware_7 = module_3.load_labware("nest_96_wellplate_100ul_pcr_full_skirt")\nlabware_7.set_offset(x=0.00, y=2.00, z=0.00)'
    const wellPlateLoadAndOffset =
      'labware_9 = protocol.load_labware("corning_24_wellplate_3.4ml_flat", location="6")\nlabware_9.set_offset(x=0.00, y=0.00, z=3.00)'

    const resultingSnippet = createSnippet({
      mode: 'jupyter',
      commands: analysisCommands,
      labware: protocolWithMagTempTC.labware,
      modules: protocolWithMagTempTC.modules,
      labwareOffsets,
      robotType: OT2_ROBOT_TYPE,
    })

    expect(resultingSnippet).toContain(jupyterPrefix)
    expect(resultingSnippet).not.toContain(cliPrefix)

    expect(resultingSnippet).toContain(
      'module_1 = protocol.load_module("magneticModuleV2", location="1")'
    )
    expect(resultingSnippet).toContain(
      'module_2 = protocol.load_module("temperatureModuleV2", location="3")'
    )
    expect(resultingSnippet).toContain(
      'module_3 = protocol.load_module("thermocyclerModuleV1", location="7")'
    )

    expect(resultingSnippet).toContain(
      'labware_1 = protocol.load_labware("opentrons_1_trash_1100ml_fixed", location="12")'
    )
    expect(resultingSnippet).toContain(
      'labware_3 = protocol.load_labware("nest_1_reservoir_195ml", location="4")'
    )
    expect(resultingSnippet).toContain(
      'labware_4 = module_1.load_labware("nest_96_wellplate_100ul_pcr_full_skirt")'
    )
    expect(resultingSnippet).toContain(
      'labware_5 = protocol.load_labware("corning_24_wellplate_3.4ml_flat", location="5")'
    )
    expect(resultingSnippet).toContain(
      'labware_6 = module_2.load_labware("opentrons_96_aluminumblock_generic_pcr_strip_200ul")'
    )
    expect(resultingSnippet).toContain(
      'labware_8 = protocol.load_labware("opentrons_96_tiprack_20ul", location="9")'
    )

    expect(resultingSnippet).toContain(tipRackLoadAndOffset)
    expect(resultingSnippet).toContain(tcPlateLoadAndOffset)
    expect(resultingSnippet).toContain(wellPlateLoadAndOffset)
  })
  it('should generate expected python snippet for cli rounding vector values to 2 fixed decimal values', () => {
    const tipRackLoadAndOffset =
      'labware_2 = protocol.load_labware("opentrons_96_tiprack_1000ul", location="2")\n    labware_2.set_offset(x=1.00, y=0.00, z=0.00)'
    const tcPlateLoadAndOffset =
      'labware_7 = module_3.load_labware("nest_96_wellplate_100ul_pcr_full_skirt")\n    labware_7.set_offset(x=0.00, y=2.00, z=0.00)'
    const wellPlateLoadAndOffset =
      'labware_9 = protocol.load_labware("corning_24_wellplate_3.4ml_flat", location="6")\n    labware_9.set_offset(x=0.00, y=0.00, z=3.00)'
    const resultingSnippet = createSnippet({
      mode: 'cli',
      commands: analysisCommands,
      labware: protocolWithMagTempTC.labware,
      modules: protocolWithMagTempTC.modules,
      labwareOffsets,
      robotType: OT2_ROBOT_TYPE,
    })

    expect(resultingSnippet).toContain(
      'module_1 = protocol.load_module("magneticModuleV2", location="1")'
    )
    expect(resultingSnippet).toContain(
      'module_2 = protocol.load_module("temperatureModuleV2", location="3")'
    )
    expect(resultingSnippet).toContain(
      'module_3 = protocol.load_module("thermocyclerModuleV1", location="7")'
    )

    expect(resultingSnippet).toContain(
      'labware_1 = protocol.load_labware("opentrons_1_trash_1100ml_fixed", location="12")'
    )
    expect(resultingSnippet).toContain(
      'labware_3 = protocol.load_labware("nest_1_reservoir_195ml", location="4")'
    )
    expect(resultingSnippet).toContain(
      'labware_4 = module_1.load_labware("nest_96_wellplate_100ul_pcr_full_skirt")'
    )
    expect(resultingSnippet).toContain(
      'labware_5 = protocol.load_labware("corning_24_wellplate_3.4ml_flat", location="5")'
    )
    expect(resultingSnippet).toContain(
      'labware_6 = module_2.load_labware("opentrons_96_aluminumblock_generic_pcr_strip_200ul")'
    )
    expect(resultingSnippet).toContain(
      'labware_8 = protocol.load_labware("opentrons_96_tiprack_20ul", location="9")'
    )
    expect(resultingSnippet).not.toContain(jupyterPrefix)
    expect(resultingSnippet).toContain(cliPrefix)
    expect(resultingSnippet).toContain(tipRackLoadAndOffset)
    expect(resultingSnippet).toContain(tcPlateLoadAndOffset)
    expect(resultingSnippet).toContain(wellPlateLoadAndOffset)
  })
})
