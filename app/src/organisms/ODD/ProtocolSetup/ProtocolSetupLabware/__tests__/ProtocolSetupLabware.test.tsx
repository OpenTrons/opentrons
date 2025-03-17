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

vi.mock('@opentrons/react-api-client', async importOriginal => {
  const actual = await importOriginal<typeof ReactApiClient>()
  return {
    ...actual,
    useCreateLiveCommandMutation: vi.fn(),
    useModulesQuery: vi.fn(),
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
  })
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders the Labware Setup page', () => {
    render()
    fireEvent.click(screen.getByRole('button', { name: 'List View' }))
    screen.getByText('Labware')
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
    screen.getByText('Labware')
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
