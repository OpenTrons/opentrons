import { COLUMN_4_SLOTS } from '@opentrons/step-generation'
import {
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  MOVABLE_TRASH_ADDRESSABLE_AREAS,
  WASTE_CHUTE_ADDRESSABLE_AREAS,
  FIXED_TRASH_ID,
  ABSORBANCE_READER_TYPE,
} from '@opentrons/shared-data'
import { SPAN7_8_10_11_SLOT } from '../constants'
import { getStagingAreaAddressableAreas } from '../utils'
import { getSlotIsEmpty } from '../step-forms'
import type {
  ModuleType,
  RobotType,
  CutoutId,
  AddressableAreaName,
} from '@opentrons/shared-data'
import type { DropdownOption } from '@opentrons/components'
import type { InitialDeckSetup } from '../step-forms'
import type { DeckSlot } from '../types'

export const SUPPORTED_MODULE_TYPES: ModuleType[] = [
  HEATERSHAKER_MODULE_TYPE,
  MAGNETIC_BLOCK_TYPE,
  MAGNETIC_MODULE_TYPE,
  TEMPERATURE_MODULE_TYPE,
  THERMOCYCLER_MODULE_TYPE,
  ABSORBANCE_READER_TYPE,
]
type SupportedSlotMap = Record<ModuleType, DropdownOption[]>
// @ts-expect-error Flex stacker not yet supported in PD
export const SUPPORTED_MODULE_SLOTS_OT2: SupportedSlotMap = {
  [MAGNETIC_MODULE_TYPE]: [
    {
      name: 'Slot 1 (supported)',
      value: '1',
    },
  ],
  [TEMPERATURE_MODULE_TYPE]: [
    {
      name: 'Slot 3 (supported)',
      value: '3',
    },
  ],
  [THERMOCYCLER_MODULE_TYPE]: [
    {
      name: 'Thermocycler slots',
      value: SPAN7_8_10_11_SLOT,
    },
  ],
  [HEATERSHAKER_MODULE_TYPE]: [
    {
      name: 'Slot 1 (supported)',
      value: '1',
    },
  ],
  [MAGNETIC_BLOCK_TYPE]: [
    {
      name: 'Slot 1 (supported)',
      value: '1',
    },
  ],
  [ABSORBANCE_READER_TYPE]: [],
}
// @ts-expect-error Flex stacker not yet supported in PD
export const SUPPORTED_MODULE_SLOTS_FLEX: SupportedSlotMap = {
  [MAGNETIC_MODULE_TYPE]: [
    {
      name: 'Slot D1',
      value: 'D1',
    },
  ],
  [TEMPERATURE_MODULE_TYPE]: [
    {
      name: 'Slot D3',
      value: 'D3',
    },
  ],
  [THERMOCYCLER_MODULE_TYPE]: [
    {
      name: 'Thermocycler slots',
      value: 'B1',
    },
  ],
  [HEATERSHAKER_MODULE_TYPE]: [
    {
      name: 'Slot D1',
      value: 'D1',
    },
  ],
  [MAGNETIC_BLOCK_TYPE]: [
    {
      name: 'Slot D2',
      value: 'D2',
    },
  ],
  [ABSORBANCE_READER_TYPE]: [
    {
      name: 'Slot D3',
      value: 'D3',
    },
  ],
}

const ALL_MODULE_SLOTS_OT2: DropdownOption[] = [
  {
    name: 'Slot 1',
    value: '1',
  },
  {
    name: 'Slot 3',
    value: '3',
  },
  {
    name: 'Slot 4',
    value: '4',
  },
  {
    name: 'Slot 6',
    value: '6',
  },
  {
    name: 'Slot 7',
    value: '7',
  },
  {
    name: 'Slot 9',
    value: '9',
  },
  {
    name: 'Slot 10',
    value: '10',
  },
]

const HEATER_SHAKER_SLOTS_OT2: DropdownOption[] = [
  {
    name: 'Slot 1',
    value: '1',
  },
  {
    name: 'Slot 3',
    value: '3',
  },
  {
    name: 'Slot 4',
    value: '4',
  },
  {
    name: 'Slot 6',
    value: '6',
  },
  {
    name: 'Slot 7',
    value: '7',
  },
  {
    name: 'Slot 10',
    value: '10',
  },
]
export const OUTER_SLOTS_FLEX: DropdownOption[] = [
  {
    name: 'Slot A1',
    value: 'A1',
  },
  {
    name: 'Slot A3',
    value: 'A3',
  },
  {
    name: 'Slot B1',
    value: 'B1',
  },
  {
    name: 'Slot B3',
    value: 'B3',
  },
  {
    name: 'Slot C1',
    value: 'C1',
  },
  {
    name: 'Slot C3',
    value: 'C3',
  },
  {
    name: 'Slot D1',
    value: 'D1',
  },
  {
    name: 'Slot D3',
    value: 'D3',
  },
]

const MAG_BLOCK_SLOTS_FLEX: DropdownOption[] = [
  {
    name: 'Slot A1',
    value: 'A1',
  },
  {
    name: 'Slot A2',
    value: 'A2',
  },
  {
    name: 'Slot A3',
    value: 'A3',
  },
  {
    name: 'Slot B1',
    value: 'B1',
  },
  {
    name: 'Slot B2',
    value: 'B2',
  },
  {
    name: 'Slot B3',
    value: 'B3',
  },
  {
    name: 'Slot C1',
    value: 'C1',
  },
  {
    name: 'Slot C2',
    value: 'C2',
  },
  {
    name: 'Slot C3',
    value: 'C3',
  },
  {
    name: 'Slot D1',
    value: 'D1',
  },
  {
    name: 'Slot D2',
    value: 'D2',
  },
  {
    name: 'Slot D3',
    value: 'D3',
  },
]
export function getAllModuleSlotsByType(
  moduleType: ModuleType,
  robotType: RobotType
): DropdownOption[] {
  const supportedSlotOption =
    robotType === 'OT-2 Standard'
      ? SUPPORTED_MODULE_SLOTS_OT2[moduleType]
      : SUPPORTED_MODULE_SLOTS_FLEX[moduleType]

  let slot = supportedSlotOption

  if (robotType === 'OT-2 Standard') {
    if (moduleType === THERMOCYCLER_MODULE_TYPE) {
      slot = supportedSlotOption
    }
    if (moduleType === HEATERSHAKER_MODULE_TYPE) {
      slot = supportedSlotOption.concat(
        HEATER_SHAKER_SLOTS_OT2.filter(
          s => s.value !== supportedSlotOption[0].value
        )
      )
    }
    const allOtherSlots = ALL_MODULE_SLOTS_OT2.filter(
      s => s.value !== supportedSlotOption[0].value
    )
    slot = supportedSlotOption.concat(allOtherSlots)
  } else {
    if (moduleType === THERMOCYCLER_MODULE_TYPE) {
      slot = supportedSlotOption
    } else if (
      moduleType === HEATERSHAKER_MODULE_TYPE ||
      moduleType === TEMPERATURE_MODULE_TYPE
    ) {
      slot = supportedSlotOption.concat(
        OUTER_SLOTS_FLEX.filter(s => s.value !== supportedSlotOption[0].value)
      )
    } else {
      slot = supportedSlotOption.concat(
        MAG_BLOCK_SLOTS_FLEX.filter(
          s => s.value !== supportedSlotOption[0].value
        )
      )
    }
  }
  return slot
}

const FLEX_MODULE_SLOTS = ['D1', 'D3', 'C1', 'C3', 'B1', 'B3', 'A1', 'A3']
const MAGNETIC_BLOCK_MODULE_SLOTS = [
  'D2',
  'C2',
  'B2',
  'A2',
  'D1',
  'D3',
  'C1',
  'C3',
  'B1',
  'B3',
  'A1',
  'A3',
]

export function getNextAvailableModuleSlot(
  initialDeckSetup: InitialDeckSetup,
  isMagneticBlock: boolean
): DeckSlot | undefined {
  return (isMagneticBlock
    ? MAGNETIC_BLOCK_MODULE_SLOTS
    : FLEX_MODULE_SLOTS
  ).find(slot => {
    const cutoutIds = Object.values(initialDeckSetup.additionalEquipmentOnDeck)
      .filter(ae => ae.name === 'stagingArea')
      .map(ae => ae.location as CutoutId)
    const stagingAreaAddressableAreaNames = getStagingAreaAddressableAreas(
      cutoutIds
    )
    const addressableAreaName = stagingAreaAddressableAreaNames.find(
      aa => aa === slot
    )
    let isSlotEmpty: boolean = getSlotIsEmpty(
      initialDeckSetup,
      slot,
      !isMagneticBlock
    )
    if (addressableAreaName == null && COLUMN_4_SLOTS.includes(slot)) {
      isSlotEmpty = false
    } else if (
      MOVABLE_TRASH_ADDRESSABLE_AREAS.includes(slot as AddressableAreaName) ||
      WASTE_CHUTE_ADDRESSABLE_AREAS.includes(slot as AddressableAreaName) ||
      slot === FIXED_TRASH_ID
    ) {
      isSlotEmpty = false
    }
    return isSlotEmpty
  })
}
