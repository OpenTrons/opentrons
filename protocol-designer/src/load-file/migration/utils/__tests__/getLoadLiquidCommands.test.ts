import { describe, it, expect } from 'vitest'
import _multipleLiquidsProtocol from 'protocol-designer/fixtures/protocol/5/multipleLiquids.json'
import { getLoadLiquidCommands } from '../getLoadLiquidCommands'
import type { ProtocolFileV5 } from '@opentrons/shared-data'
import type { DesignerApplicationData } from '../getLoadLiquidCommands'

const multipleLiquidsProtocol = (_multipleLiquidsProtocol as unknown) as ProtocolFileV5<DesignerApplicationData>

describe('getLoadLiquidCommands', () => {
  it('creates loadLiquid commands', () => {
    const expectedLoadLiquidCommands = [
      {
        key: expect.any(String),
        commandType: 'loadLiquid',
        params: {
          liquidId: '0',
          labwareId:
            '6114d3d0-b759-11ec-81e8-7fa12dc3e861:opentrons/opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap/1', // this is just taken from the fixture
          volumeByWell: {
            A1: 222,
            B1: 222,
            C1: 222,
            D1: 222,
            A2: 222,
            B2: 222,
            C2: 222,
            D2: 222,
          },
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLiquid',
        params: {
          liquidId: '1',
          labwareId:
            '6114d3d0-b759-11ec-81e8-7fa12dc3e861:opentrons/opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap/1', // this is just taken from the fixture
          volumeByWell: {
            A3: 333,
            B3: 333,
            C3: 333,
            D3: 333,
            A4: 333,
            B4: 333,
            C4: 333,
            D4: 333,
          },
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLiquid',
        params: {
          liquidId: '2',
          labwareId:
            '6114d3d0-b759-11ec-81e8-7fa12dc3e861:opentrons/opentrons_24_tuberack_eppendorf_1.5ml_safelock_snapcap/1', // this is just taken from the fixture
          volumeByWell: {
            A5: 444,
            B5: 444,
            C5: 444,
            D5: 444,
            A6: 444,
            B6: 444,
            C6: 444,
            D6: 444,
          },
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLiquid',
        params: {
          liquidId: '0',
          labwareId:
            '64c66a20-b759-11ec-81e8-7fa12dc3e861:opentrons/usascientific_96_wellplate_2.4ml_deep/1', // this is just taken from the fixture
          volumeByWell: {
            A1: 555,
            B1: 555,
            C1: 555,
            D1: 555,
            E1: 555,
            F1: 555,
            G1: 555,
            H1: 555,
            A2: 555,
            B2: 555,
            C2: 555,
            D2: 555,
            E2: 555,
            F2: 555,
            G2: 555,
            H2: 555,
            A3: 555,
            B3: 555,
            C3: 555,
            D3: 555,
            E3: 555,
            F3: 555,
            G3: 555,
            H3: 555,
          },
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLiquid',
        params: {
          liquidId: '1',
          labwareId:
            '64c66a20-b759-11ec-81e8-7fa12dc3e861:opentrons/usascientific_96_wellplate_2.4ml_deep/1', // this is just taken from the fixture
          volumeByWell: {
            A4: 666,
            B4: 666,
            C4: 666,
            D4: 666,
            E4: 666,
            F4: 666,
            G4: 666,
            H4: 666,
            A5: 666,
            B5: 666,
            C5: 666,
            D5: 666,
            E5: 666,
            F5: 666,
            G5: 666,
            H5: 666,
            A6: 666,
            B6: 666,
            C6: 666,
            D6: 666,
            E6: 666,
            F6: 666,
            G6: 666,
            H6: 666,
          },
        },
      },
      {
        key: expect.any(String),
        commandType: 'loadLiquid',
        params: {
          liquidId: '2',
          labwareId:
            '64c66a20-b759-11ec-81e8-7fa12dc3e861:opentrons/usascientific_96_wellplate_2.4ml_deep/1', // this is just taken from the fixture
          volumeByWell: {
            A7: 777,
            B7: 777,
            C7: 777,
            D7: 777,
            E7: 777,
            F7: 777,
            G7: 777,
            H7: 777,
            A8: 777,
            B8: 777,
            C8: 777,
            D8: 777,
            E8: 777,
            F8: 777,
            G8: 777,
            H8: 777,
            A9: 777,
            B9: 777,
            C9: 777,
            D9: 777,
            E9: 777,
            F9: 777,
            G9: 777,
            H9: 777,
            A10: 777,
            B10: 777,
            C10: 777,
            D10: 777,
            E10: 777,
            F10: 777,
            G10: 777,
            H10: 777,
            A11: 777,
            B11: 777,
            C11: 777,
            D11: 777,
            E11: 777,
            F11: 777,
            G11: 777,
            H11: 777,
            A12: 777,
            B12: 777,
            C12: 777,
            D12: 777,
            E12: 777,
            F12: 777,
            G12: 777,
            H12: 777,
          },
        },
      },
    ]
    const ingredients =
      multipleLiquidsProtocol.designerApplication?.data?.ingredients
    const ingredLocations =
      multipleLiquidsProtocol.designerApplication?.data?.ingredLocations
    expect(getLoadLiquidCommands(ingredients, ingredLocations)).toEqual(
      expect.arrayContaining(expectedLoadLiquidCommands)
    )
  })
})
