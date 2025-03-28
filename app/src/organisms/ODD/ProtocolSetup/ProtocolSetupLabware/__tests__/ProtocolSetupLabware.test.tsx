import { fireEvent, screen } from '@testing-library/react'
import { when } from 'vitest-when'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, vi, beforeEach, afterEach, expect } from 'vitest'

import {
  useCreateLiveCommandMutation,
  useModulesQuery,
} from '@opentrons/react-api-client'
import {
  HEATERSHAKER_MODULE_V1_FIXTURE,
  ot3StandardDeckV5 as ot3StandardDeckDef,
} from '@opentrons/shared-data'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { useMostRecentCompletedAnalysis } from '/app/resources/runs'
import { getProtocolModulesInfo } from '/app/transformations/analysis/getProtocolModulesInfo'
import { getStackedItemsOnStartingDeck } from '/app/transformations/commands'
import { ProtocolSetupLabware } from '..'
import {
  mockProtocolModuleInfo,
  mockRecentAnalysis,
  mockUseModulesQueryClosed,
  mockUseModulesQueryClosing,
  mockUseModulesQueryOpen,
  mockUseModulesQueryOpening,
  mockUseModulesQueryUnknown,
} from '../__fixtures__'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'

import type * as ReactApiClient from '@opentrons/react-api-client'
import type * as AppCommandTransformations from '/app/transformations/commands'

vi.mock('@opentrons/react-api-client', async importOriginal => {
  const actual = await importOriginal<typeof ReactApiClient>()
  return {
    ...actual,
    useCreateLiveCommandMutation: vi.fn(),
    useModulesQuery: vi.fn(),
  }
})
vi.mock('/app/transformations/commands', async importOriginal => {
  const actual = await importOriginal<typeof AppCommandTransformations>()
  return {
    ...actual,
    getStackedItemsOnStartingDeck: vi.fn(),
  }
})

vi.mock('/app/resources/runs')
vi.mock('/app/transformations/analysis/getProtocolModulesInfo')
vi.mock('/app/resources/deck_configuration')

const RUN_ID = "otie's run"
const mockSetSetupScreen = vi.fn()
const mockRefetch = vi.fn()
const mockCreateLiveCommand = vi.fn()

const render = () => {
  let confirmed = false
  const setIsConfirmed = vi.fn((ready: boolean) => {
    confirmed = ready
  })
  return renderWithProviders(
    <MemoryRouter>
      <ProtocolSetupLabware
        runId={RUN_ID}
        setSetupScreen={mockSetSetupScreen}
        isConfirmed={confirmed}
        setIsConfirmed={setIsConfirmed}
      />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('ProtocolSetupLabware', () => {
  beforeEach(() => {
    mockCreateLiveCommand.mockResolvedValue(null)
    when(vi.mocked(useMostRecentCompletedAnalysis))
      .calledWith(RUN_ID)
      .thenReturn(mockRecentAnalysis)
    when(vi.mocked(getProtocolModulesInfo))
      .calledWith(mockRecentAnalysis, ot3StandardDeckDef as any)
      .thenReturn(mockProtocolModuleInfo)
    vi.mocked(useModulesQuery).mockReturnValue({
      ...mockUseModulesQueryOpen,
      refetch: mockRefetch,
    } as any)
    vi.mocked(useCreateLiveCommandMutation).mockReturnValue({
      createLiveCommand: mockCreateLiveCommand,
    } as any)
    vi.mocked(useNotifyDeckConfigurationQuery).mockReturnValue({
      data: [
        {
          cutoutId: 'cutoutB1',
          cutoutFixtureId: HEATERSHAKER_MODULE_V1_FIXTURE,
          opentronsModuleSerialNumber:
            mockUseModulesQueryClosed.data.data[0].serialNumber,
        },
      ],
    } as any)
    vi.mocked(getStackedItemsOnStartingDeck).mockReturnValue({
      A3: [
        {
          labwareId: 'fixedTrash',
          definitionUri: 'opentrons/opentrons_1_trash_1100ml_fixed/1',
          displayName: 'Trash',
        },
      ],
      D2: [
        {
          labwareId:
            '8c75a22a-88e5-42fb-bd92-c2cceeeda504:opentrons/opentrons_96_filtertiprack_1000ul/1',
          displayName: 'Opentrons 96 Filter Tip Rack 1000 µL',
          definitionUri: 'opentrons/opentrons_96_filtertiprack_1000ul/1',
        },
      ],
      D3: [
        {
          labwareId:
            'a2eccd35-f173-4e6e-8eee-b9a8ca436e8f:opentrons/opentrons_96_filtertiprack_200ul/1',
          displayName: 'Opentrons 96 Filter Tip Rack 200 µL',
          definitionUri: 'opentrons/opentrons_96_filtertiprack_200ul/1',
        },
      ],
      A1: [
        {
          labwareId:
            '8057ec40-8d53-4d44-aeb7-726a76c10901:opentrons/opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep/1',
          definitionUri:
            'opentrons/opentrons_96_deep_well_adapter_nest_wellplate_2ml_deep/1',
          displayName: 'module labware',
        },
        {
          moduleId:
            'ebdc5f07-57de-4b3f-a946-583f78f65675:heaterShakerModuleType',
          moduleModel: 'heaterShakerModuleV1',
        },
      ],
    })
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Labware Setup page', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    screen.getByText('Labware & Liquids')
    screen.getByText('Labware name')
    screen.getByText('Location')
    screen.getByRole('button', { name: 'Map View' })
  })

  it('correctly navigates with the nav button', () => {
    render()
    fireEvent.click(screen.getAllByRole('button')[0])
    expect(mockSetSetupScreen).toHaveBeenCalledWith('prepare to run')
  })

  it('should toggle between map view and list view', () => {
    render()
    expect(screen.queryByText('Map View')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    expect(screen.queryByText('List View')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Map View' }))
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    screen.getByText('Labware & Liquids')
    screen.getByText('Labware name')
    screen.getByText('Location')
  })

  it('sends a latch-close command when the labware latch is open and the button is clicked', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    fireEvent.click(screen.getByText('Labware Latch'))
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'heaterShaker/closeLabwareLatch',
        params: {
          moduleId: '8bcc37fdfcb4c2b5ab69963c589ceb1f9b1d1c4f',
        },
      },
      waitUntilComplete: true,
    })
  })

  it('sends a latch-open command when the labware latch is closed and the button is clicked', () => {
    vi.mocked(useModulesQuery).mockReturnValue({
      ...mockUseModulesQueryClosed,
      refetch: mockRefetch,
    } as any)
    render()
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    fireEvent.click(screen.getByText('Labware Latch'))
    expect(mockCreateLiveCommand).toHaveBeenCalledWith({
      command: {
        commandType: 'heaterShaker/openLabwareLatch',
        params: {
          moduleId: '8bcc37fdfcb4c2b5ab69963c589ceb1f9b1d1c4f',
        },
      },
      waitUntilComplete: true,
    })
  })

  it('shows opening transition states of the labware latch button', () => {
    vi.mocked(useModulesQuery).mockReturnValue(
      mockUseModulesQueryOpening as any
    )

    render()
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    screen.getByText('Opening...')
  })

  it('shows closing transition state of the labware latch button', () => {
    vi.mocked(useModulesQuery).mockReturnValue(
      mockUseModulesQueryClosing as any
    )
    render()
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    screen.getByText('Closing...')
  })

  it('defaults to open when latch status is unknown', () => {
    vi.mocked(useModulesQuery).mockReturnValue(
      mockUseModulesQueryUnknown as any
    )

    render()
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    screen.getByText('Open')
  })
})
