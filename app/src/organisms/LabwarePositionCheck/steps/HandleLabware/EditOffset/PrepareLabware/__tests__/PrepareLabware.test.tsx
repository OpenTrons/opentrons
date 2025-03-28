import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'

import {
  mockSelectedLwOverview,
  mockActivePipette,
  MockLPCContentContainer,
} from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { PrepareLabware } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/PrepareLabware'
import {
  selectActivePipette,
  selectSelectedLwOverview,
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
  setInitialPosition,
} from '/app/redux/protocol-runs'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: vi.fn(),
  }
})
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/PrepareLabware/LPCDeck',
  () => ({
    LPCDeck: vi
      .fn()
      .mockImplementation(() => (
        <div data-testid="mock-lpc-deck">Mock LPC Deck</div>
      )),
  })
)
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/PrepareLabware/PlaceItemInstruction',
  () => ({
    PlaceItemInstruction: vi
      .fn()
      .mockImplementation(() => (
        <div data-testid="mock-place-item-instruction" />
      )),
  })
)
vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: MockLPCContentContainer,
}))
vi.mock('/app/molecules/InterventionModal', () => ({
  TwoColumn: vi
    .fn()
    .mockImplementation(({ children }) => (
      <div data-testid="two-column">{children}</div>
    )),
}))
vi.mock('/app/redux/protocol-runs', () => ({
  selectActivePipette: vi.fn(),
  selectSelectedLwOverview: vi.fn(),
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset: vi.fn(),
  setInitialPosition: vi.fn(),
}))

describe('PrepareLabware', () => {
  let mockDispatch: Mock
  let mockToggleRobotMoving: Mock
  let mockHandleConfirmLwModulePlacement: Mock
  let mockProceedSubstep: Mock
  let mockGoBackSubstep: Mock
  let props: ComponentProps<typeof PrepareLabware>

  beforeEach(() => {
    mockDispatch = vi.fn()
    vi.mocked(useDispatch).mockReturnValue(mockDispatch)

    mockToggleRobotMoving = vi.fn().mockResolvedValue(undefined)
    mockHandleConfirmLwModulePlacement = vi
      .fn()
      .mockResolvedValue({ x: 102, y: 203, z: 51 })
    mockProceedSubstep = vi.fn()
    mockGoBackSubstep = vi.fn()

    props = {
      runId: 'test-run-id',
      contentHeader: 'Test Content Header',
      proceedSubstep: mockProceedSubstep,
      goBackSubstep: mockGoBackSubstep,
      commandUtils: {
        toggleRobotMoving: mockToggleRobotMoving,
        handleConfirmLwModulePlacement: mockHandleConfirmLwModulePlacement,
      } as any,
    } as any

    vi.mocked(
      selectActivePipette
    ).mockImplementation((runId: string) => (state: any) => mockActivePipette)

    vi.mocked(
      selectSelectedLwOverview
    ).mockImplementation((runId: string) => (state: any) =>
      mockSelectedLwOverview
    )

    vi.mocked(
      selectSelectedLwWithOffsetDetailsMostRecentVectorOffset
    ).mockImplementation((runId: string) => (state: any) => ({
      x: 1,
      y: 2,
      z: 3,
    }))

    vi.mocked(setInitialPosition).mockReturnValue({
      type: 'SET_INITIAL_POSITION',
    } as any)
  })

  const render = (propsToRender: ComponentProps<typeof PrepareLabware>) => {
    const mockState = {
      protocolRuns: {
        [propsToRender.runId]: {
          lpc: {
            protocolData: {
              modules: {},
              labware: {
                'test-labware-uri': {
                  id: 'test-labware-id',
                  displayName: 'Test Labware',
                  labwareType: 'well_plate',
                  slot: 'A1',
                },
              },
            },
            labwareDefs: {},
          },
        },
      },
    }

    return renderWithProviders(<PrepareLabware {...propsToRender} />, {
      i18nInstance: i18n,
      initialState: mockState,
    })[0]
  }

  it('passes correct header props to LPCContentContainer', () => {
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Test Content Header')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute(
      'data-button-text',
      'Confirm placement'
    )
    expect(primaryButton).toHaveAttribute('data-click-handler', 'true')
  })

  it('renders the LPCDeck component', () => {
    render(props)
    expect(screen.getByTestId('mock-lpc-deck')).toBeInTheDocument()
  })

  it('renders the PlaceItemInstruction component', () => {
    render(props)
    expect(
      screen.getByTestId('mock-place-item-instruction')
    ).toBeInTheDocument()
  })

  it('handles confirm button click correctly', async () => {
    render(props)

    const primaryButton = screen.getByTestId('primary-button')
    primaryButton.click()

    expect(mockToggleRobotMoving).toHaveBeenCalledWith(true)

    await vi.waitFor(() => {
      expect(
        mockHandleConfirmLwModulePlacement
      ).toHaveBeenCalledWith(
        mockSelectedLwOverview.offsetLocationDetails,
        mockActivePipette.id,
        { x: 1, y: 2, z: 3 }
      )

      expect(mockDispatch).toHaveBeenCalledWith(
        setInitialPosition(props.runId, {
          labwareUri: mockSelectedLwOverview.uri,
          location: mockSelectedLwOverview.offsetLocationDetails,
          position: { x: 102, y: 203, z: 51 },
        })
      )

      expect(mockProceedSubstep).toHaveBeenCalled()
      expect(mockToggleRobotMoving).toHaveBeenCalledWith(false)
    })
  })
})
