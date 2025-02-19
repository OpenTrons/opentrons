import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { migrateFile } from '../6_0_0'
import { getLoadLiquidCommands } from '../utils/getLoadLiquidCommands'
import _oldDoItAllProtocol from 'protocol-designer/fixtures/protocol/5/doItAllV5.json'
import _oldMultipleLiquidsProtocol from 'protocol-designer/fixtures/protocol/5/multipleLiquids.json'
import type { ProtocolFileV5 } from '@opentrons/shared-data'

const oldDoItAllProtocol = (_oldDoItAllProtocol as unknown) as ProtocolFileV5<any>
const oldMultipleLiquidsProtocol = (_oldMultipleLiquidsProtocol as unknown) as ProtocolFileV5<any>

vi.mock('../utils/getLoadLiquidCommands')

describe('v6 migration', () => {
  beforeEach(() => {
    vi.mocked(getLoadLiquidCommands).mockReturnValue([])
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('removes slot from modules and labware', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)

    expect(
      oldDoItAllProtocol.modules[
        '0b419310-75c7-11ea-b42f-4b64e50f43e5:magneticModuleType'
      ].slot
    ).toEqual('1')
    expect(
      oldDoItAllProtocol.labware[
        '0b44c760-75c7-11ea-b42f-4b64e50f43e5:opentrons/opentrons_96_tiprack_300ul/1'
      ].slot
    ).toEqual('2')
    expect(
      migratedFile.modules[
        '0b419310-75c7-11ea-b42f-4b64e50f43e5:magneticModuleType'
        //  @ts-expect-error: slot does not exist in modules in v6
      ].slot
    ).toBeUndefined()
    expect(
      migratedFile.labware[
        '0b44c760-75c7-11ea-b42f-4b64e50f43e5:opentrons/opentrons_96_tiprack_300ul/1'
        //  @ts-expect-error: slot does not exist in labware in v6
      ].slot
    ).toBeUndefined()
  })
  it('removes mount from pipettes', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    expect(
      oldDoItAllProtocol.pipettes['0b3f2210-75c7-11ea-b42f-4b64e50f43e5'].mount
    ).toEqual('left')
    expect(
      //  @ts-expect-error: mount does not exist in pipettes in v6
      migratedFile.pipettes['0b3f2210-75c7-11ea-b42f-4b64e50f43e5'].mount
    ).toBeUndefined()
  })
  it('adds deckId to Robot', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    expect(oldDoItAllProtocol.robot).toEqual({ model: 'OT-2 Standard' })
    expect(migratedFile.robot).toEqual({
      model: 'OT-2 Standard',
      deckId: 'ot2_standard',
    })
  })
  it('adds a liquids key', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const expectedLiquids = { '0': { displayName: 'Water', description: '' } }
    expect(migratedFile.liquids).toEqual(expectedLiquids)
  })
  it('creates loadModule commands', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const expectedLoadModuleCommands = [
      {
        key: expect.any(String),
        commandType: 'loadModule',
        params: {
          moduleId: '0b419310-75c7-11ea-b42f-4b64e50f43e5:magneticModuleType',
          location: { slotName: '1' },
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadModule',
        params: {
          moduleId:
            '0b4319b0-75c7-11ea-b42f-4b64e50f43e5:temperatureModuleType',
          location: { slotName: '3' },
        },
      },
    ]

    const loadModuleCommands = migratedFile.commands.filter(
      command => command.commandType === 'loadModule'
    )
    expect(loadModuleCommands).toEqual(expectedLoadModuleCommands)
  })
  it('creates loadPipette commands', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const expectedLoadPipetteCommands = [
      {
        key: expect.any(String),
        commandType: 'loadPipette',
        params: {
          pipetteId: '0b3f2210-75c7-11ea-b42f-4b64e50f43e5',
          mount: 'left',
        },
      },
    ]
    const loadPipetteCommands = migratedFile.commands.filter(
      command => command.commandType === 'loadPipette'
    )
    expect(loadPipetteCommands).toEqual(expectedLoadPipetteCommands)
  })
  it('creates loadLabware commands', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const loadLabwareCommands = migratedFile.commands.filter(
      command => command.commandType === 'loadLabware'
    )
    const expectedLoadLabwareCommaands = [
      {
        key: expect.any(String),
        commandType: 'loadLabware',
        params: { labwareId: 'fixedTrash', location: { slotName: '12' } },
      },
      {
        key: expect.any(String),
        commandType: 'loadLabware',
        params: {
          labwareId:
            '0b44c760-75c7-11ea-b42f-4b64e50f43e5:opentrons/opentrons_96_tiprack_300ul/1',
          location: { slotName: '2' },
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLabware',
        params: {
          labwareId:
            '1e610d40-75c7-11ea-b42f-4b64e50f43e5:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1',
          location: {
            slotName: '0b419310-75c7-11ea-b42f-4b64e50f43e5:magneticModuleType',
          },
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLabware',
        params: {
          labwareId:
            '21ed8f60-75c7-11ea-b42f-4b64e50f43e5:opentrons/opentrons_24_aluminumblock_generic_2ml_screwcap/1',
          location: {
            slotName:
              '0b4319b0-75c7-11ea-b42f-4b64e50f43e5:temperatureModuleType',
          },
        },
      },
    ]
    expect(loadLabwareCommands).toEqual(expectedLoadLabwareCommaands)
  })
  it('creates loadLiquid commands', () => {
    migrateFile(oldDoItAllProtocol)
    expect(vi.mocked(getLoadLiquidCommands)).toHaveBeenCalledWith(
      _oldDoItAllProtocol.designerApplication.data.ingredients,
      _oldDoItAllProtocol.designerApplication.data.ingredLocations
    )
  })
  it('replaces air gap commands with aspirate commands', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const expectedConvertedAirgapCommands = [
      {
        key: expect.any(String), // no key used to exist in v5 commands
        commandType: 'aspirate', // used to be airGap
        params: {
          pipetteId: '0b3f2210-75c7-11ea-b42f-4b64e50f43e5', // used to be pipette
          volume: 30,
          labwareId:
            '1e610d40-75c7-11ea-b42f-4b64e50f43e5:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1', // used to be labware
          offsetFromBottomMm: 15.78,
          flowRate: 46.43,
          wellName: 'A1',
        },
      },
      {
        key: expect.any(String), // no key used to exist in v5 commands
        commandType: 'aspirate', // used to be airGap
        params: {
          pipetteId: '0b3f2210-75c7-11ea-b42f-4b64e50f43e5', // used to be pipette
          volume: 30,
          labwareId:
            '1e610d40-75c7-11ea-b42f-4b64e50f43e5:opentrons/nest_96_wellplate_100ul_pcr_full_skirt/1', // used to be labware
          offsetFromBottomMm: 15.78,
          flowRate: 46.43,
          wellName: 'B1',
        },
      },
    ]
    expect(migratedFile.commands).toEqual(
      expect.arrayContaining(expectedConvertedAirgapCommands)
    )
  })
  // see https://github.com/Opentrons/opentrons/issues/8153
  it('unchecks aspirate delay and dispense delay when no offset was applied', () => {
    const migratedFile = migrateFile(oldMultipleLiquidsProtocol)
    const TRANSFER_STEP_ID = 'b98d3ec0-c024-11ec-aabf-8ff28455296a' // this is just taken from the fixture
    expect(
      (migratedFile as any).designerApplication.data.savedStepForms[
        TRANSFER_STEP_ID
      ].aspirate_delay_checkbox
    ).toBe(false)
    expect(
      (migratedFile as any).designerApplication.data.savedStepForms[
        TRANSFER_STEP_ID
      ].dispense_delay_checkbox
    ).toBe(false)
  })

  it('maps v5 delays to v6 delays', () => {
    const migratedFile = migrateFile(oldDoItAllProtocol)
    const expectedConvertedDelayCommands = [
      {
        key: expect.any(String), // no key used to exist in v5 commands
        commandType: 'delay',
        params: { message: '', seconds: 62 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: { seconds: 2 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: { seconds: 2 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: { seconds: 1 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: { seconds: 1 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: { seconds: 2 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: { seconds: 2 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: { seconds: 1 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: { seconds: 1 },
      },
      {
        key: expect.any(String),
        commandType: 'delay',
        params: {
          message: 'Wait until user intervention',
          waitForResume: true,
        },
      },
    ]
    expect(migratedFile.commands).toEqual(
      expect.arrayContaining(expectedConvertedDelayCommands)
    )
  })
})
