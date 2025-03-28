import { describe, it, expect } from 'vitest'
import {
  ABSORBANCE_READER_V1,
  FLEX_ROBOT_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  HEATERSHAKER_MODULE_V1,
  MAGNETIC_BLOCK_V1,
  MAGNETIC_MODULE_TYPE,
  MAGNETIC_MODULE_V1,
  OT2_ROBOT_TYPE,
  THERMOCYCLER_MODULE_V1,
  THERMOCYCLER_MODULE_V2,
  WASTE_CHUTE_CUTOUT,
} from '@opentrons/shared-data'
import {
  getDeckErrors,
  getIsEntityOnSlotInUse,
  getModuleModelsBySlot,
  getSVGContainerWidth,
} from '../utils'
import { FLEX_MODULE_MODELS, OT2_MODULE_MODELS } from '../constants'
import type {
  LabwareOnDeck,
  ModuleOnDeck,
  SavedStepFormState,
} from '../../../../step-forms'
import type { AdditionalEquipment } from '../../utils'

describe('getModuleModelsBySlot', () => {
  it('renders no modules for ot-2 middle slot', () => {
    expect(getModuleModelsBySlot(OT2_ROBOT_TYPE, '5')).toEqual([])
  })
  it('renders all ot-2 modules for slot 7', () => {
    expect(getModuleModelsBySlot(OT2_ROBOT_TYPE, '7')).toEqual(
      OT2_MODULE_MODELS
    )
  })
  it('renders ot-2 modules minus thermocyclers for slot 1', () => {
    const noTC = OT2_MODULE_MODELS.filter(
      model =>
        model !== THERMOCYCLER_MODULE_V1 && model !== THERMOCYCLER_MODULE_V2
    )
    expect(getModuleModelsBySlot(OT2_ROBOT_TYPE, '1')).toEqual(noTC)
  })
  it('renders ot-2 modules minus thermocyclers & heater-shaker for slot 9', () => {
    const noTCAndHS = OT2_MODULE_MODELS.filter(
      model =>
        model !== THERMOCYCLER_MODULE_V1 &&
        model !== THERMOCYCLER_MODULE_V2 &&
        model !== HEATERSHAKER_MODULE_V1
    )
    expect(getModuleModelsBySlot(OT2_ROBOT_TYPE, '9')).toEqual(noTCAndHS)
  })
  it('renders flex modules for middle slots', () => {
    expect(getModuleModelsBySlot(FLEX_ROBOT_TYPE, 'B2')).toEqual([
      MAGNETIC_BLOCK_V1,
    ])
  })
  it('renders all flex modules for B1', () => {
    expect(getModuleModelsBySlot(FLEX_ROBOT_TYPE, 'B1')).toEqual(
      FLEX_MODULE_MODELS.filter(model => model !== ABSORBANCE_READER_V1)
    )
  })
  it('renders all flex modules for C1', () => {
    const noTC = FLEX_MODULE_MODELS.filter(
      model =>
        model !== THERMOCYCLER_MODULE_V2 && model !== ABSORBANCE_READER_V1
    )
    expect(getModuleModelsBySlot(FLEX_ROBOT_TYPE, 'C1')).toEqual(noTC)
  })
})

describe('getDeckErrors', () => {
  it('renders no error when there is no conflict', () => {
    expect(
      getDeckErrors({
        modules: {},
        selectedSlot: '1',
        selectedModel: MAGNETIC_MODULE_V1,
        labware: {},
        robotType: OT2_ROBOT_TYPE,
      })
    ).toEqual(null)
  })
  it('renders H-S adjacent error', () => {
    expect(
      getDeckErrors({
        modules: {
          hs: {
            model: HEATERSHAKER_MODULE_V1,
            type: HEATERSHAKER_MODULE_TYPE,
            id: 'mockId',
            slot: '4',
            moduleState: {} as any,
            pythonName: 'mockPythonName',
          },
        },
        selectedSlot: '1',
        selectedModel: MAGNETIC_MODULE_V1,
        labware: {},
        robotType: OT2_ROBOT_TYPE,
      })
    ).toEqual('heater_shaker_adjacent')
  })
  it('renders module adjacent error', () => {
    expect(
      getDeckErrors({
        modules: {
          hs: {
            model: MAGNETIC_MODULE_V1,
            type: MAGNETIC_MODULE_TYPE,
            id: 'mockId',
            slot: '4',
            moduleState: {} as any,
            pythonName: 'mockPythonName',
          },
        },
        selectedSlot: '1',
        selectedModel: HEATERSHAKER_MODULE_V1,
        labware: {},
        robotType: OT2_ROBOT_TYPE,
      })
    ).toEqual('heater_shaker_adjacent_to')
  })
})

describe('getSVGContainerWidth', () => {
  it('returns 78.5% for OT2 robot type, startingDeck tab, and not zoomed', () => {
    const result = getSVGContainerWidth(OT2_ROBOT_TYPE, 'startingDeck', false)
    expect(result).toBe('78.5%')
  })

  it('returns 70% for non-OT2 robot type, not zoomed, and tab not protocolSteps', () => {
    const result = getSVGContainerWidth(FLEX_ROBOT_TYPE, 'anotherTab', false)
    expect(result).toBe('70%')
  })

  it('returns 100% for OT2 robot type, startingDeck tab, and zoomed', () => {
    const result = getSVGContainerWidth(OT2_ROBOT_TYPE, 'startingDeck', true)
    expect(result).toBe('100%')
  })

  it('returns 100% for non-OT2 robot type and zoomed', () => {
    const result = getSVGContainerWidth(FLEX_ROBOT_TYPE, 'anotherTab', true)
    expect(result).toBe('100%')
  })

  it('returns 100% for OT2 robot type and tab other than startingDeck or protocolSteps', () => {
    const result = getSVGContainerWidth(FLEX_ROBOT_TYPE, 'protocolSteps', false)
    expect(result).toBe('100%')
  })

  it('returns 100% for non-OT2 robot type and tab protocolSteps', () => {
    const result = getSVGContainerWidth(FLEX_ROBOT_TYPE, 'protocolSteps', false)
    expect(result).toBe('100%')
  })
})

const mockSavedSteps: SavedStepFormState = {
  mockId: {
    moduleId: 'mockHeaterShakerId',
    id: 'mockId',
    stepType: 'heaterShaker',
  },
  mockId2: {
    labware: 'mockLabwareId',
    newLocation: 'mockHeaterShakerId',
    id: 'mockId2',
    stepType: 'moveLabware',
  },
  mockId3: {
    aspirate_labware: 'mockLabwareId',
    dispense_labware: 'mockLabwareId',
    dropTip_location: 'mockWasteChute',
    stepType: 'moveLiquid',
    id: 'mockId3',
  },
}
let mockLabware: LabwareOnDeck = {
  slot: 'A3',
  id: 'mockLabwareId',
  pythonName: 'mockPythonName',
  labwareDefURI: 'mockURI',
  def: {} as any,
}
const mockModule: ModuleOnDeck = {
  slot: 'A3',
  type: 'heaterShakerModuleType',
  id: 'mockHeaterShakerId',
  model: 'heaterShakerModuleV1',
  pythonName: 'mockPythonName',
  moduleState: {} as any,
}
const mockFixtures: AdditionalEquipment[] = [
  {
    name: 'wasteChute',
    id: 'mockWasteChute',
    location: WASTE_CHUTE_CUTOUT,
  },
]
describe('getIsEntityOnSlotIsInUse', () => {
  it('returns true when there is a module in use', () => {
    expect(getIsEntityOnSlotInUse(mockSavedSteps, null, mockModule)).toBe(true)
  })
  it('returns true when there is a labware in use', () => {
    expect(
      getIsEntityOnSlotInUse(mockSavedSteps, null, undefined, mockLabware)
    ).toBe(true)
  })
  it('returns true when there is a nested labware in use', () => {
    expect(
      getIsEntityOnSlotInUse(
        mockSavedSteps,
        null,
        undefined,
        undefined,
        mockLabware
      )
    ).toBe(true)
  })
  it('returns true when there is a matchingLabwareFor4thColumn in use', () => {
    mockLabware = {
      ...mockLabware,
      slot: 'A4',
    }
    expect(getIsEntityOnSlotInUse(mockSavedSteps, mockLabware)).toBe(true)
  })
  it('returns true when there is a fixture in use', () => {
    expect(
      getIsEntityOnSlotInUse(
        mockSavedSteps,
        null,
        undefined,
        undefined,
        undefined,
        mockFixtures
      )
    ).toBe(true)
  })
  it('returns false when there are no steps use', () => {
    expect(
      getIsEntityOnSlotInUse(
        {},
        mockLabware,
        mockModule,
        mockLabware,
        mockLabware,
        mockFixtures
      )
    ).toBe(false)
  })
})
