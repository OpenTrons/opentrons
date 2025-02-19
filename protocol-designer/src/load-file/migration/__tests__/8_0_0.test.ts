import { describe, it, expect, vi } from 'vitest'
import { migrateFile } from '../8_0_0'
import _oldDoItAllProtocol from 'protocol-designer/fixtures/protocol/7/doItAllV7.json'
import type { ProtocolFileV7 } from '@opentrons/shared-data'

vi.mock('/protocol-designer/labware-defs')

const oldDoItAllProtocol = (_oldDoItAllProtocol as unknown) as ProtocolFileV7<any>

describe('v8.0 migration', () => {
  it('migrated the load labware as usual', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const expectedLoadLabwareCommands = [
      {
        commandType: 'loadLabware',
        key: expect.any(String),
        params: {
          displayName: 'Opentrons 96 Flat Bottom Heater-Shaker Adapter',
          labwareId:
            'd95bb3be-b453-457c-a947-bd03dc8e56b9:opentrons/opentrons_96_flat_bottom_adapter/1',
          loadName: 'opentrons_96_flat_bottom_adapter',
          location: {
            moduleId:
              'c19dffa3-cb34-4702-bcf6-dcea786257d1:heaterShakerModuleType',
          },
          namespace: 'opentrons',
          version: 1,
        },
      },
      {
        commandType: 'loadLabware',
        key: expect.any(String),
        params: {
          displayName: 'Opentrons Flex 96 Filter Tip Rack 50 µL',
          labwareId:
            '23ed35de-5bfd-4bb0-8f54-da99a2804ed9:opentrons/opentrons_flex_96_filtertiprack_50ul/1',
          loadName: 'opentrons_flex_96_filtertiprack_50ul',
          location: {
            slotName: 'C1',
          },
          namespace: 'opentrons',
          version: 1,
        },
      },
      {
        commandType: 'loadLabware',
        key: expect.any(String),
        params: {
          displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
          labwareId:
            'fcba73e7-b88e-438e-963e-f8b9a5de0983:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/2',
          loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
          location: {
            moduleId:
              '627b7a27-5bb7-46de-a530-67af45652e3b:thermocyclerModuleType',
          },
          namespace: 'opentrons',
          version: 2,
        },
      },
      {
        commandType: 'loadLabware',
        key: expect.any(String),
        params: {
          displayName:
            'Opentrons 24 Well Aluminum Block with NEST 1.5 mL Snapcap',
          labwareId:
            'a793a135-06aa-4ed6-a1d3-c176c7810afa:opentrons/opentrons_24_aluminumblock_nest_1.5ml_snapcap/1',
          loadName: 'opentrons_24_aluminumblock_nest_1.5ml_snapcap',
          location: {
            moduleId:
              'ef44ad7f-0fd9-46d6-8bc0-c70785644cc8:temperatureModuleType',
          },
          namespace: 'opentrons',
          version: 1,
        },
      },
      {
        commandType: 'loadLabware',
        key: expect.any(String),
        params: {
          displayName: 'NEST 96 Well Plate 200 µL Flat',
          labwareId:
            '239ceac8-23ec-4900-810a-70aeef880273:opentrons/nest_96_wellplate_200ul_flat/2',
          loadName: 'nest_96_wellplate_200ul_flat',
          location: {
            labwareId:
              'd95bb3be-b453-457c-a947-bd03dc8e56b9:opentrons/opentrons_96_flat_bottom_adapter/1',
          },
          namespace: 'opentrons',
          version: 2,
        },
      },
    ]
    const loadLabwareCommands = migratedFile.commands.filter(
      command => command.commandType === 'loadLabware'
    )
    expect(loadLabwareCommands).toEqual(expectedLoadLabwareCommands)
  })
})
