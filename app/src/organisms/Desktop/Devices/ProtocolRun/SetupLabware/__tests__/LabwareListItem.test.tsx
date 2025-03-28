import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { opentrons96PcrAdapterV1 } from '@opentrons/shared-data'
import { useCreateLiveCommandMutation } from '@opentrons/react-api-client'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockHeaterShaker,
  mockMagneticModule,
  mockTemperatureModule,
  mockThermocycler,
} from '/app/redux/modules/__fixtures__'
import { mockLabwareDef } from '/app/organisms/LegacyLabwarePositionCheck/__fixtures__/mockLabwareDef'
import { SecureLabwareModal } from '../SecureLabwareModal'
import { LabwareListItem } from '../LabwareListItem'

import type { ComponentProps } from 'react'
import type {
  ModuleModel,
  ModuleType,
  LabwareDefinition2,
} from '@opentrons/shared-data'
import type { AttachedModule } from '/app/redux/modules/types'
import type { ModuleRenderInfoForProtocol } from '/app/resources/runs'

vi.mock('../SecureLabwareModal')
vi.mock('@opentrons/react-api-client')

const mockAdapterDef = opentrons96PcrAdapterV1 as LabwareDefinition2
const mockAdapterId = 'mockAdapterId'
const mockNestedLabwareDisplayName = 'nested labware display name'
const mockLocationInfo = {
  labwareOffset: { x: 1, y: 1, z: 1 },
  cornerOffsetFromSlot: { x: 1, y: 1, z: 1 },
  dimensions: {
    xDimension: 100,
    yDimension: 100,
    footprintXDimension: 50,
    footprintYDimension: 50,
    labwareInterfaceXDimension: 80,
    labwareInterfaceYDimension: 120,
  },
  twoDimensionalRendering: { children: [] },
}
const mockAttachedModuleInfo = {
  x: 1,
  y: 1,
  z: 1,
  nestedLabwareDef: mockLabwareDef,
  nestedLabwareId: '1',
  nestedLabwareDisplayName: mockNestedLabwareDisplayName,
  protocolLoadOrder: 0,
  slotName: '7',
}
const mockModuleSlot = { slotName: '7' }
const mockThermocyclerModuleDefinition = {
  moduleId: 'someThermocyclerModule',
  model: 'thermocyclerModuleV1' as ModuleModel,
  type: 'thermocyclerModuleType' as ModuleType,
  ...mockLocationInfo,
}
const mockModuleId = 'moduleId'
const mockNickName = 'nickName'

const render = (props: ComponentProps<typeof LabwareListItem>) => {
  return renderWithProviders(
    <MemoryRouter>
      <LabwareListItem {...props} />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('LabwareListItem', () => {
  const mockCreateLiveCommand = vi.fn()
  beforeEach(() => {
    mockCreateLiveCommand.mockResolvedValue(null)
    vi.mocked(SecureLabwareModal).mockReturnValue(
      <div>mock secure labware modal</div>
    )
    vi.mocked(useCreateLiveCommandMutation).mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)
  })

  it('renders the correct info for a thermocycler (OT2), clicking on secure labware instructions opens the modal', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: mockNickName,
          definitionUri: 'mockDefUri',
        },
        {
          moduleId: 'thermocyclerModuleId',
          moduleModel: 'thermocyclerModuleV1' as ModuleModel,
        },
      ],
      extraAttentionModules: ['thermocyclerModuleType'],
      attachedModuleInfo: {
        [mockModuleId]: ({
          moduleId: 'thermocyclerModuleId',
          attachedModuleMatch: (mockThermocycler as any) as AttachedModule,
          moduleDef: mockThermocyclerModuleDefinition as any,
          ...mockAttachedModuleInfo,
        } as any) as ModuleRenderInfoForProtocol,
      },
      isFlex: false,
      slotName: '7,8,10,11',
      onClick: vi.fn(),
      labwareByLiquidId: {},
    })
    screen.getByText('nickName')
    screen.getByTestId('DeckInfoLabel_ot-thermocycler')
    screen.getByTestId('slot_info_7,8,10,11')
    const button = screen.getByText('Secure labware instructions')
    fireEvent.click(button)
    screen.getByText('mock secure labware modal')
  })

  it('renders the correct info for a thermocycler (OT3)', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: mockNickName,
          definitionUri: 'mockDefUri',
        },
        {
          moduleId: 'thermocyclerModuleId',
          moduleModel: 'thermocyclerModuleV1' as ModuleModel,
        },
      ],
      extraAttentionModules: ['thermocyclerModuleType'],
      attachedModuleInfo: {
        [mockModuleId]: ({
          moduleId: 'thermocyclerModuleId',
          attachedModuleMatch: (mockThermocycler as any) as AttachedModule,
          moduleDef: mockThermocyclerModuleDefinition as any,
          ...mockAttachedModuleInfo,
        } as any) as ModuleRenderInfoForProtocol,
      },
      isFlex: true,
      slotName: 'A1+B1',
      onClick: vi.fn(),
    })
    screen.getByText(mockNickName)
    screen.getByTestId('DeckInfoLabel_ot-thermocycler')
    screen.getByTestId('DeckInfoLabel_A1+B1')
  })

  it('renders the correct info for a labware on top of a magnetic module', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: mockNickName,
          definitionUri: 'mockDefUri',
        },
        {
          moduleId: 'magneticModuleId',
          moduleModel: 'magneticModuleV1' as ModuleModel,
        },
      ],
      slotName: mockModuleSlot.slotName,
      extraAttentionModules: ['magneticModuleType'],
      attachedModuleInfo: {
        [mockModuleId]: ({
          moduleId: 'magneticModuleId',

          attachedModuleMatch: (mockMagneticModule as any) as AttachedModule,
          moduleDef: {
            moduleId: 'someMagneticModule',
            model: 'magneticModuleV2' as ModuleModel,
            type: 'magneticModuleType' as ModuleType,
            ...mockLocationInfo,
          } as any,
          ...mockAttachedModuleInfo,
        } as any) as ModuleRenderInfoForProtocol,
      },
      isFlex: false,
      onClick: vi.fn(),
    })
    screen.getByText(mockNickName)
    screen.getByTestId('DeckInfoLabel_ot-magnet-v2')
    screen.getByTestId('slot_info_7')
    const button = screen.getByText('Secure labware instructions')
    fireEvent.click(button)
    screen.getByText('mock secure labware modal')
  })

  it('renders the correct info for a labware on top of a temperature module', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: mockNickName,
          definitionUri: 'mockDefUri',
        },
        {
          moduleId: 'temperatureModuleId',
          moduleModel: 'temperatureModuleV1' as ModuleModel,
        },
      ],
      slotName: mockModuleSlot.slotName,
      extraAttentionModules: [],
      attachedModuleInfo: {
        [mockModuleId]: ({
          moduleId: 'temperatureModuleId',
          attachedModuleMatch: (mockTemperatureModule as any) as AttachedModule,
          moduleDef: {
            moduleId: 'someTemperatureModule',
            model: 'temperatureModuleV2' as ModuleModel,
            type: 'temperatureModuleType' as ModuleType,
            ...mockLocationInfo,
          } as any,
          ...mockAttachedModuleInfo,
        } as any) as ModuleRenderInfoForProtocol,
      },
      isFlex: false,
      onClick: vi.fn(),
    })
    screen.getByText(mockNickName)
    screen.getByTestId('DeckInfoLabel_ot-temperature-v2')
    screen.getByTestId('slot_info_7')
  })

  it('renders the correct info for a labware on an adapter on top of a temperature module', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: mockNickName,
          definitionUri: 'mockDefUri',
        },
        {
          labwareId: mockAdapterId,
          displayName: mockAdapterDef.metadata.displayName,
          definitionUri: 'mockDefUri2',
        },
        {
          moduleId: 'temperatureModuleId',
          moduleModel: 'temperatureModuleV2' as ModuleModel,
        },
      ],
      slotName: '7',
      extraAttentionModules: [],
      attachedModuleInfo: {
        [mockModuleId]: ({
          moduleId: 'temperatureModuleId',
          attachedModuleMatch: (mockTemperatureModule as any) as AttachedModule,
          moduleDef: {
            moduleId: 'someTemperatureModule',
            model: 'temperatureModuleV2' as ModuleModel,
            type: 'temperatureModuleType' as ModuleType,
            ...mockLocationInfo,
          } as any,
          ...mockAttachedModuleInfo,
        } as any) as ModuleRenderInfoForProtocol,
      },
      isFlex: false,
      onClick: vi.fn(),
    })
    screen.getByText(mockNickName)
    screen.getByTestId('slot_info_7')
    screen.getByTestId('DeckInfoLabel_ot-temperature-v2')
    screen.getByTestId('DeckInfoLabel_stacked')
    screen.getByText(mockAdapterDef.metadata.displayName)
  })

  it('renders the correct info for a labware on an adapter on the deck', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: 'labware nick name',
          definitionUri: 'mockDefUri',
        },
        {
          labwareId: mockAdapterId,
          displayName: 'mock adapter nick name',
          definitionUri: 'mockDefUri2',
        },
      ],
      slotName: 'A2',
      extraAttentionModules: [],
      attachedModuleInfo: {},
      isFlex: true,
      onClick: vi.fn(),
    })
    screen.getByText('labware nick name')
    screen.getByTestId('DeckInfoLabel_A2')
    screen.getByTestId('DeckInfoLabel_stacked')
    screen.getByText('mock adapter nick name')
  })

  it('renders the correct info for a labware on top of a heater shaker', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: mockNickName,
          definitionUri: 'mockDefUri',
        },
        {
          moduleId: mockModuleId,
          moduleModel: 'heaterShakerModuleV1' as ModuleModel,
        },
      ],
      slotName: mockModuleSlot.slotName,
      extraAttentionModules: ['heaterShakerModuleType'],
      attachedModuleInfo: {
        [mockModuleId]: ({
          moduleId: 'heaterShakerModuleId',
          attachedModuleMatch: (mockHeaterShaker as any) as AttachedModule,
          moduleDef: {
            moduleId: 'someheaterShakerModule',
            model: 'heaterShakerModuleV1' as ModuleModel,
            type: 'heaterShakerModuleType' as ModuleType,
            ...mockLocationInfo,
          } as any,
          ...mockAttachedModuleInfo,
        } as any) as ModuleRenderInfoForProtocol,
      },
      isFlex: false,
      onClick: vi.fn(),
    })
    screen.getByText(mockNickName)
    screen.getByTestId('DeckInfoLabel_ot-heater-shaker')
    screen.getByTestId('slot_info_7')
    screen.getByText('Labware Latch')
    screen.getByText('Secure')
    const button = screen.getByLabelText('heater_shaker_7_latch_toggle')
    fireEvent.click(button)
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'heaterShaker/closeLabwareLatch',
        params: {
          moduleId: mockHeaterShaker.id,
        },
      },
    })
  })

  it('renders the correct info for an off deck labware', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: mockLabwareDef.metadata.displayName,
          definitionUri: 'mockDefUri',
        },
      ],
      slotName: 'offDeck',
      extraAttentionModules: [],
      attachedModuleInfo: {},
      isFlex: false,
      onClick: vi.fn(),
    })
    screen.getByText('Mock Labware Definition')
    screen.getByTestId('slot_info_OFF DECK')
  })
  it('renders the correct info for labware with a lid', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: 'tiprack displayName',
          definitionUri: 'mockDefUri',
          lidDisplayName: 'tiprack lid',
          lidId: '4',
        },
      ],
      slotName: 'A2',
      extraAttentionModules: [],
      attachedModuleInfo: {},
      isFlex: true,
      onClick: vi.fn(),
    })
    screen.getByText('tiprack displayName')
    screen.getByText('With tiprack lid')
    screen.getByTestId('DeckInfoLabel_A2')
  })
  it('renders the correct info for stack of like labware', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: 'tc lid',
          definitionUri: 'mockDefUri',
        },
        {
          labwareId: '8',
          displayName: 'tc lid',
          definitionUri: 'mockDefUri',
        },
        {
          labwareId: '9',
          displayName: 'tc lid',
          definitionUri: 'mockDefUri',
        },
      ],
      slotName: 'A2',
      extraAttentionModules: [],
      attachedModuleInfo: {},
      isFlex: true,
      onClick: vi.fn(),
    })
    screen.getByText('tc lid')
    screen.getByTestId('DeckInfoLabel_A2')
    screen.getByTestId('DeckInfoLabel_stacked')
    screen.getByText('Quantity: 3')
  })
  it('renders the correct info for labware with one liquids', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: 'mock wellplate name',
          definitionUri: 'mockDefUri',
        },
      ],
      slotName: 'A2',
      extraAttentionModules: [],
      attachedModuleInfo: {},
      isFlex: true,
      onClick: vi.fn(),
      labwareByLiquidId: {
        '123': [
          {
            labwareId: '7',
            volumeByWell: {},
          },
        ],
      },
    })
    screen.getByText('mock wellplate name')
    screen.getByTestId('DeckInfoLabel_A2')
    screen.getByText('1 liquid')
  })
  it('renders the correct info for labware with multiple liquids', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: 'mock wellplate name',
          definitionUri: 'mockDefUri',
        },
      ],
      slotName: 'A2',
      extraAttentionModules: [],
      attachedModuleInfo: {},
      isFlex: true,
      onClick: vi.fn(),
      labwareByLiquidId: {
        '123': [
          {
            labwareId: '7',
            volumeByWell: {},
          },
        ],
        '56': [
          {
            labwareId: '7',
            volumeByWell: {},
          },
        ],
      },
    })
    screen.getByText('mock wellplate name')
    screen.getByTestId('DeckInfoLabel_A2')
    screen.getByText('2 liquids')
  })
  it('renders the correct info for stack of varied labware with liquids', () => {
    render({
      stackedItems: [
        {
          labwareId: '7',
          displayName: 'mock wellplate name',
          definitionUri: 'mockDefUri',
        },
        {
          labwareId: '5',
          displayName: 'mock wellplate name',
          definitionUri: 'mockDefUri',
        },
      ],
      slotName: 'A2',
      extraAttentionModules: [],
      attachedModuleInfo: {},
      isFlex: true,
      onClick: vi.fn(),
      labwareByLiquidId: {
        '123': [
          {
            labwareId: '7',
            volumeByWell: {},
          },
        ],
        '56': [
          {
            labwareId: '7',
            volumeByWell: {},
          },
        ],
      },
    })
    screen.getByText('mock wellplate name')
    screen.getByTestId('DeckInfoLabel_stacked')
    screen.getByTestId('DeckInfoLabel_A2')
    screen.getByText('Quantity: 2')
    screen.getByText('Multiple liquid layouts')
  })
})
