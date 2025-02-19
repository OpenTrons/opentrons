import { describe, it, expect, afterEach, vi } from 'vitest'
import { migrateFile } from '../7_0_0'
import _oldDoItAllProtocol from 'protocol-designer/fixtures/protocol/6/doItAllV4MigratedToV6.json'
import type { ProtocolFileV6 } from '@opentrons/shared-data'

const oldDoItAllProtocol = (_oldDoItAllProtocol as unknown) as ProtocolFileV6<any>

describe('v7 migration', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('modifies loadModule commands', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const expectedLoadModuleCommands = [
      {
        key: expect.any(String),
        commandType: 'loadModule',
        params: {
          moduleId: '0b419310-75c7-11ea-b42f-4b64e50f43e5:magneticModuleType',
          location: { slotName: '1' },
          model: 'magneticModuleV2',
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadModule',
        params: {
          moduleId:
            '0b4319b0-75c7-11ea-b42f-4b64e50f43e5:temperatureModuleType',
          location: { slotName: '3' },
          model: 'temperatureModuleV2',
        },
      },
    ]

    const loadModuleCommands = migratedFile.commands.filter(
      command => command.commandType === 'loadModule'
    )
    expect(loadModuleCommands).toEqual(expectedLoadModuleCommands)
  })
  it('modifies loadPipette commands', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const expectedLoadPipetteCommands = [
      {
        key: expect.any(String),
        commandType: 'loadPipette',
        params: {
          pipetteId: '0b3f2210-75c7-11ea-b42f-4b64e50f43e5',
          mount: 'left',
          pipetteName: 'p300_single_gen2',
        },
      },
    ]
    const loadPipetteCommands = migratedFile.commands.filter(
      command => command.commandType === 'loadPipette'
    )
    expect(loadPipetteCommands).toEqual(expectedLoadPipetteCommands)
  })
  it('modifies loadLabware commands', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const loadLabwareCommands = migratedFile.commands.filter(
      command => command.commandType === 'loadLabware'
    )
    const expectedLoadLabwareCommaands = [
      {
        key: expect.any(String),
        commandType: 'loadLabware',
        params: {
          labwareId:
            '0b44c760-75c7-11ea-b42f-4b64e50f43e5:opentrons/opentrons_96_tiprack_300ul/1',
          location: { slotName: '2' },
          displayName: 'Opentrons 96 Tip Rack 300 µL',
          loadName: 'opentrons_96_tiprack_300ul',
          namespace: 'opentrons',
          version: 1,
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLabware',
        params: {
          labwareId:
            '1e610d40-75c7-11ea-b42f-4b64e50f43e5:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
          location: {
            moduleId: '0b419310-75c7-11ea-b42f-4b64e50f43e5:magneticModuleType',
          },
          displayName: 'NEST 96 Well Plate 100 µL PCR Full Skirt',
          loadName: 'nest_96_wellplate_100ul_pcr_full_skirt',
          namespace: 'opentrons',
          version: 1,
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLabware',
        params: {
          labwareId:
            '21ed8f60-75c7-11ea-b42f-4b64e50f43e5:opentrons/opentrons_24_aluminumblock_generic_2ml_screwcap/1',
          location: {
            moduleId:
              '0b4319b0-75c7-11ea-b42f-4b64e50f43e5:temperatureModuleType',
          },
          namespace: 'opentrons',
          version: 1,
          loadName: 'opentrons_24_aluminumblock_generic_2ml_screwcap',
          displayName:
            'Opentrons 24 Well Aluminum Block with Generic 2 mL Screwcap',
        },
      },
    ]
    expect(loadLabwareCommands).toEqual(expectedLoadLabwareCommaands)
  })
})
