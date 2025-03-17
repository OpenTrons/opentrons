import { describe, it, expect } from 'vitest'
import doItAllV7 from '../../../../../fixtures/protocol/7/doItAllV7.json'
import { getEquipmentLoadInfoFromCommands } from '../getEquipmentLoadInfoFromCommands'
import type { CreateCommand, LabwareDefinition2 } from '@opentrons/shared-data'
import type { EquipmentLoadInfoFromCommands } from '../getEquipmentLoadInfoFromCommands'

describe('getEquipmentLoadInfoFromCommands', () => {
  it('properly returns the pipettes, modules, and labware info for doItAllV7 fixture', () => {
    const results: EquipmentLoadInfoFromCommands = {
      labware: {
        '239ceac8-23ec-4900-810a-70aeef880273:opentrons/nest_96_wellplate_200ul_flat/2': {
          displayName: 'NEST 96 Well Plate 200 µL Flat',
          labwareDefURI: 'opentrons/nest_96_wellplate_200ul_flat/2',
        },
        '23ed35de-5bfd-4bb0-8f54-da99a2804ed9:opentrons/opentrons_flex_96_filtertiprack_50ul/1': {
          displayName: 'Opentrons Flex 96 Filter Tip Rack 50 µL',
          labwareDefURI: 'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
        },
        'a793a135-06aa-4ed6-a1d3-c176c7810afa:opentrons/opentrons_24_aluminumblock_nest_1.5ml_snapcap/1': {
          displayName:
            'Opentrons 24 Well Aluminum Block with NEST 1.5 mL Snapcap',
          labwareDefURI:
            'opentrons/opentrons_24_aluminumblock_nest_1.5ml_snapcap/1',
        },
        'd95bb3be-b453-457c-a947-bd03dc8e56b9:opentrons/opentrons_96_flat_bottom_adapter/1': {
          displayName: 'Opentrons 96 Flat Bottom Heater-Shaker Adapter',
          labwareDefURI: 'opentrons/opentrons_96_flat_bottom_adapter/1',
        },
        'fcba73e7-b88e-438e-963e-f8b9a5de0983:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2': {
          displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
          labwareDefURI: 'opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
        },
      },
      modules: {
        '1be16305-74e7-4bdb-9737-61ec726d2b44:magneticBlockType': {
          model: 'magneticBlockV1',
        },
        '627b7a27-5bb7-46de-a530-67af45652e3b:thermocyclerModuleType': {
          model: 'thermocyclerModuleV2',
        },
        'c19dffa3-cb34-4702-bcf6-dcea786257d1:heaterShakerModuleType': {
          model: 'heaterShakerModuleV1',
        },
        'ef44ad7f-0fd9-46d6-8bc0-c70785644cc8:temperatureModuleType': {
          model: 'temperatureModuleV2',
        },
      },
      pipettes: {
        '2e7c6344-58ab-465c-b542-489883cb63fe': {
          pipetteName: 'p1000_single_flex',
        },
        '6d1e53c3-2db3-451b-ad60-3fe13781a193': {
          pipetteName: 'p50_multi_flex',
        },
      },
    }

    expect(
      getEquipmentLoadInfoFromCommands(
        doItAllV7.commands as CreateCommand[],
        doItAllV7.labwareDefinitions as {
          [definitionId: string]: LabwareDefinition2
        }
      )
    ).toEqual(results)
  })
})
