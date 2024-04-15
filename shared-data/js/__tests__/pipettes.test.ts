// tests for pipette info accessors in `shared-data/js/pipettes.js`
import { describe, expect, it } from 'vitest'
import {
  getPipetteSpecsV2,
  getPipetteNameSpecs,
  getPipetteModelSpecs,
} from '../pipettes'
import type { PipetteV2LiquidSpecs, PipetteV2Specs } from '../types'

const PIPETTE_NAMES = [
  'p10_single',
  'p50_single',
  'p300_single',
  'p1000_single',
  'p10_multi',
  'p50_multi',
  'p300_multi',
] as const

const PIPETTE_MODELS = [
  'p10_single_v1',
  'p10_single_v1.3',
  'p10_single_v1.4',
  'p10_single_v1.5',
  'p10_multi_v1',
  'p10_multi_v1.3',
  'p10_multi_v1.4',
  'p10_multi_v1.5',
  'p50_single_v1',
  'p50_single_v1.3',
  'p50_single_v1.4',
  'p50_multi_v1',
  'p50_multi_v1.3',
  'p50_multi_v1.4',
  'p50_multi_v1.5',
  'p300_single_v1',
  'p300_single_v1.3',
  'p300_single_v1.4',
  'p300_single_v1.5',
  'p300_multi_v1',
  'p300_multi_v1.3',
  'p300_multi_v1.4',
  'p300_multi_v1.5',
  'p1000_single_v1',
  'p1000_single_v1.3',
  'p1000_single_v1.4',
  'p1000_single_v1.5',
] as const

describe('pipette data accessors', () => {
  describe('getPipetteNameSpecs', () => {
    PIPETTE_NAMES.forEach(name =>
      it(`name ${name} snapshot`, () =>
        expect(getPipetteNameSpecs(name)).toMatchSnapshot())
    )
  })

  describe('getPipetteModelSpecs', () => {
    PIPETTE_MODELS.forEach(model =>
      it(`model ${model} snapshot`, () =>
        expect(getPipetteModelSpecs(model)).toMatchSnapshot())
    )
  })

  describe('getPipetteSpecsV2', () => {
    it('returns the correct info for p1000_single_flex', () => {
      const mockP1000Specs = {
        $otSharedSchema: '#/pipette/schemas/2/pipetteGeometrySchema.json',
        availableSensors: {
          sensors: ['pressure', 'capacitive', 'environment'],
          capacitive: { count: 1 },
          environment: { count: 1 },
          pressure: { count: 1 },
        },
        backCompatNames: [],
        backlashDistance: 0.1,
        channels: 1,
        displayCategory: 'FLEX',
        displayName: 'Flex 1-Channel 1000 μL',
        dropTipConfigurations: { plungerEject: { current: 1, speed: 10 } },
        liquids: {
          default: {
            $otSharedSchema:
              '#/pipette/schemas/2/pipetteLiquidPropertiesSchema.json',
            defaultTipOverlapDictionary: {
              default: 10.5,
              'opentrons/opentrons_flex_96_tiprack_1000ul/1': 10.5,
              'opentrons/opentrons_flex_96_tiprack_200ul/1': 10.5,
              'opentrons/opentrons_flex_96_tiprack_50ul/1': 10.5,
              'opentrons/opentrons_flex_96_filtertiprack_1000ul/1': 10.5,
              'opentrons/opentrons_flex_96_filtertiprack_200ul/1': 10.5,
              'opentrons/opentrons_flex_96_filtertiprack_50ul/1': 10.5,
            },
            defaultTipracks: [
              'opentrons/opentrons_flex_96_tiprack_1000ul/1',
              'opentrons/opentrons_flex_96_tiprack_200ul/1',
              'opentrons/opentrons_flex_96_tiprack_50ul/1',
              'opentrons/opentrons_flex_96_filtertiprack_1000ul/1',
              'opentrons/opentrons_flex_96_filtertiprack_200ul/1',
              'opentrons/opentrons_flex_96_filtertiprack_50ul/1',
            ],
            minVolume: 5,
            maxVolume: 1000,
            supportedTips: expect.anything(),
          },
        },
        model: 'p1000',
        nozzleMap: expect.anything(),
        pathTo3D:
          'pipette/definitions/2/geometry/single_channel/p1000/placeholder.gltf',
        pickUpTipConfigurations: {
          pressFit: {
            speedByTipCount: expect.anything(),
            presses: 1,
            increment: 0,
            distanceByTipCount: expect.anything(),
            currentByTipCount: expect.anything(),
          },
        },
        partialTipConfigurations: {
          availableConfigurations: null,
          partialTipSupported: false,
        },
        plungerHomingConfigurations: { current: 1, speed: 30 },
        plungerMotorConfigurations: { idle: 0.3, run: 1 },
        plungerPositionsConfigurations: {
          default: { blowout: 76.5, bottom: 71.5, drop: 90.5, top: 0.5 },
        },
        quirks: [],
        shaftDiameter: 4.5,
        shaftULperMM: 15.904,
        nozzleOffset: [-8, -22, -259.15],
        orderedColumns: expect.anything(),
        orderedRows: expect.anything(),
        pipetteBoundingBoxOffsets: {
          backLeftCorner: [-8, -22, -259.15],
          frontRightCorner: [-8, -22, -259.15],
        },
      } as PipetteV2Specs
      expect(getPipetteSpecsV2('p1000_single_flex')).toStrictEqual(
        mockP1000Specs
      )
    })
  })
  it('returns the correct liquid info for a p50 pipette with default and lowVolume', () => {
    const tiprack50uL = 'opentrons/opentrons_flex_96_tiprack_50ul/1'
    const tiprackFilter50uL = 'opentrons/opentrons_flex_96_filtertiprack_50ul/1'

    const mockLiquidDefault = {
      $otSharedSchema: '#/pipette/schemas/2/pipetteLiquidPropertiesSchema.json',
      defaultTipOverlapDictionary: {
        default: 10.5,
        [tiprackFilter50uL]: 10.5,
        [tiprack50uL]: 10.5,
      },
      defaultTipracks: [tiprack50uL, tiprackFilter50uL],
      maxVolume: 50,
      minVolume: 5,
      supportedTips: {
        t50: {
          uiMaxFlowRate: 43.2,
          aspirate: {
            default: {
              1: expect.anything(),
            },
          },
          defaultAspirateFlowRate: {
            default: 35,
            valuesByApiLevel: {
              '2.14': 35,
            },
          },
          defaultBlowOutFlowRate: {
            default: 57,
            valuesByApiLevel: {
              '2.14': 57,
            },
          },
          defaultDispenseFlowRate: {
            default: 57,
            valuesByApiLevel: {
              '2.14': 57,
            },
          },
          defaultFlowAcceleration: 1200,
          defaultPushOutVolume: 2,
          defaultReturnTipHeight: 0.71,
          defaultTipLength: 57.9,
          dispense: {
            default: {
              1: expect.anything(),
            },
          },
        },
      },
    } as PipetteV2LiquidSpecs
    const mockLiquidLowVolume = {
      $otSharedSchema: '#/pipette/schemas/2/pipetteLiquidPropertiesSchema.json',
      defaultTipOverlapDictionary: {
        default: 10.5,
        [tiprackFilter50uL]: 10.5,
        [tiprack50uL]: 10.5,
      },
      defaultTipracks: [tiprack50uL, tiprackFilter50uL],
      maxVolume: 30,
      minVolume: 1,
      supportedTips: {
        t50: {
          uiMaxFlowRate: 24.6,
          aspirate: {
            default: {
              1: expect.anything(),
            },
          },
          defaultAspirateFlowRate: {
            default: 35,
            valuesByApiLevel: {
              2.14: 35,
            },
          },
          defaultBlowOutFlowRate: {
            default: 57,
            valuesByApiLevel: {
              2.14: 57,
            },
          },
          defaultDispenseFlowRate: {
            default: 57,
            valuesByApiLevel: {
              2.14: 57,
            },
          },
          defaultFlowAcceleration: 1200,
          defaultPushOutVolume: 7,
          defaultReturnTipHeight: 0.71,
          defaultTipLength: 57.9,
          dispense: {
            default: {
              1: expect.anything(),
            },
          },
        },
      },
    } as PipetteV2LiquidSpecs
    const mockLiquids: Record<string, PipetteV2LiquidSpecs> = {
      default: mockLiquidDefault,
      lowVolumeDefault: mockLiquidLowVolume,
    }
    expect(getPipetteSpecsV2('p50_single_v3.5')?.liquids).toStrictEqual(
      mockLiquids
    )
  })
})
