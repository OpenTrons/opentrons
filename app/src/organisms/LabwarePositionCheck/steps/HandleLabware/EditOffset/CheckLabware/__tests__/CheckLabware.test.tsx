import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'

import {
  mockSelectedLwOverview,
  mockActivePipette,
} from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { CheckLabware } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware'
import {
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset,
  selectActivePipette,
  selectIsSelectedLwTipRack,
  selectSelectedLwOverview,
  setFinalPosition,
  goBackEditOffsetSubstep,
  proceedEditOffsetSubstep,
  selectSelectedLwWithOffsetDetailsWorkingOffsets,
} from '/app/redux/protocol-runs'
import { getIsOnDevice } from '/app/redux/config'

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
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware/LPCLabwareJogRender',
  () => ({
    LPCLabwareJogRender: vi
      .fn()
      .mockImplementation(() => (
        <div data-testid="mock-labware-jog">Mock Labware Jog</div>
      )),
  })
)
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset/CheckLabware/LPCJogControlsOdd',
  () => ({
    LPCJogControlsOdd: vi.fn().mockImplementation(({ toggleJogControls }) => (
      <div data-testid="mock-jog-controls">
        Mock Jog Controls
        <button onClick={toggleJogControls}>Close</button>
      </div>
    )),
  })
)
vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: vi
    .fn()
    .mockImplementation(
      ({ children, header, buttonText, onClickButton, onClickBack }) => (
        <div data-testid="lpc-content-container">
          <h2 data-testid="header">{header}</h2>
          <button onClick={onClickBack} aria-label="Back">
            Back
          </button>
          {children}
          <button onClick={onClickButton}>{buttonText}</button>
        </div>
      )
    ),
}))
vi.mock('/app/redux/protocol-runs', () => ({
  selectSelectedLwWithOffsetDetailsMostRecentVectorOffset: vi.fn(),
  selectActivePipette: vi.fn(),
  selectIsSelectedLwTipRack: vi.fn(),
  selectSelectedLwOverview: vi.fn(),
  setFinalPosition: vi.fn(),
  goBackEditOffsetSubstep: vi.fn(),
  proceedEditOffsetSubstep: vi.fn(),
  selectSelectedLwWithOffsetDetailsWorkingOffsets: vi.fn(),
}))
vi.mock('/app/redux/config', () => ({
  getIsOnDevice: vi.fn(),
}))

describe('CheckLabware', () => {
  let mockDispatch: Mock
  let mockToggleRobotMoving: Mock
  let mockHandleConfirmLwFinalPosition: Mock
  let mockHandleJog: Mock
  let mockHandleResetLwModulesOnDeck: Mock
  let props: ComponentProps<typeof CheckLabware>

  beforeEach(() => {
    mockDispatch = vi.fn()
    vi.mocked(useDispatch).mockReturnValue(mockDispatch)

    mockToggleRobotMoving = vi.fn().mockResolvedValue(undefined)
    mockHandleConfirmLwFinalPosition = vi
      .fn()
      .mockResolvedValue({ x: 102, y: 203, z: 51 })
    mockHandleJog = vi
      .fn()
      .mockImplementation((axis, direction, step, setPosition) => {
        setPosition({ x: 100, y: 200, z: 50 })
        return Promise.resolve()
      })
    mockHandleResetLwModulesOnDeck = vi.fn().mockResolvedValue(undefined)

    props = {
      runId: 'test-run-id',
      contentHeader: 'Test Content Header',
      commandUtils: {
        toggleRobotMoving: mockToggleRobotMoving,
        handleConfirmLwFinalPosition: mockHandleConfirmLwFinalPosition,
        handleJog: mockHandleJog,
        handleResetLwModulesOnDeck: mockHandleResetLwModulesOnDeck,
      } as any,
    } as any

    vi.mocked(getIsOnDevice).mockReturnValue(false)
    vi.mocked(
      selectSelectedLwWithOffsetDetailsWorkingOffsets
    ).mockImplementation((runId: string) => (state: any) =>
      ({
        initialPosition: { x: 100, y: 200, z: 50 },
      } as any)
    )
    vi.mocked(
      selectSelectedLwWithOffsetDetailsMostRecentVectorOffset
    ).mockImplementation((runId: string) => (state: any) => ({
      x: 1,
      y: 2,
      z: 3,
    }))
    vi.mocked(
      selectIsSelectedLwTipRack
    ).mockImplementation((runId: string) => (state: any) => false)
    vi.mocked(
      selectSelectedLwOverview
    ).mockImplementation((runId: string) => (state: any) =>
      mockSelectedLwOverview
    )
    vi.mocked(
      selectActivePipette
    ).mockImplementation((runId: string) => (state: any) => mockActivePipette)
    vi.mocked(setFinalPosition).mockReturnValue({
      type: 'SET_FINAL_POSITION',
    } as any)
    vi.mocked(proceedEditOffsetSubstep).mockReturnValue({
      type: 'PROCEED_EDIT_OFFSET_SUBSTEP',
    } as any)
    vi.mocked(goBackEditOffsetSubstep).mockReturnValue({
      type: 'GO_BACK_EDIT_OFFSET_SUBSTEP',
    } as any)
  })

  const render = (propsToRender: ComponentProps<typeof CheckLabware>) => {
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
          },
        },
      },
    }

    return renderWithProviders(<CheckLabware {...propsToRender} />, {
      i18nInstance: i18n,
      initialState: mockState,
    })[0]
  }

  it('renders the component with correct header', () => {
    render(props)
    expect(screen.getByTestId('header')).toHaveTextContent(
      'Test Content Header'
    )
  })

  it('renders the LPCContentContainer component', () => {
    render(props)
    expect(screen.getByTestId('lpc-content-container')).toBeInTheDocument()
  })

  it('renders the labware jog component', () => {
    render(props)
    expect(screen.getByTestId('mock-labware-jog')).toBeInTheDocument()
  })

  it('renders the confirm button', () => {
    render(props)
    expect(screen.getByText(/confirm placement/i)).toBeInTheDocument()
  })

  it('renders a back button', () => {
    render(props)
    expect(screen.getByLabelText('Back')).toBeInTheDocument()
  })

  it('handles confirm button click correctly', async () => {
    render(props)

    const confirmButton = screen.getByText(/confirm placement/i)
    fireEvent.click(confirmButton)

    expect(mockToggleRobotMoving).toHaveBeenCalledWith(true)

    await vi.waitFor(() => {
      expect(mockHandleConfirmLwFinalPosition).toHaveBeenCalledWith(
        mockSelectedLwOverview.offsetLocationDetails,
        mockActivePipette
      )

      expect(mockDispatch).toHaveBeenCalledWith(
        setFinalPosition(props.runId, {
          labwareUri: mockSelectedLwOverview.uri,
          location: mockSelectedLwOverview.offsetLocationDetails,
          position: { x: 102, y: 203, z: 51 },
        })
      )

      expect(mockDispatch).toHaveBeenCalledWith(
        proceedEditOffsetSubstep(props.runId)
      )

      expect(mockToggleRobotMoving).toHaveBeenCalledWith(false)
    })
  })

  it('handles back button click correctly', async () => {
    render(props)

    const backButton = screen.getByLabelText('Back')
    fireEvent.click(backButton)

    expect(mockToggleRobotMoving).toHaveBeenCalledWith(true)

    await vi.waitFor(() => {
      expect(mockHandleResetLwModulesOnDeck).toHaveBeenCalledWith(
        mockSelectedLwOverview.offsetLocationDetails
      )
      expect(mockDispatch).toHaveBeenCalledWith(
        goBackEditOffsetSubstep(props.runId)
      )
      expect(mockToggleRobotMoving).toHaveBeenCalledWith(false)
    })
  })

  it('handles "Move Pipette" button click', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)

    render(props)

    const moveButton = screen.getAllByText('Move pipette')[1]
    fireEvent.click(moveButton)

    expect(screen.getByTestId('mock-jog-controls')).toBeInTheDocument()
  })

  it('works with different selector return values', () => {
    vi.mocked(
      selectIsSelectedLwTipRack
    ).mockImplementation((runId: string) => (state: any) => true)

    vi.mocked(
      selectSelectedLwWithOffsetDetailsMostRecentVectorOffset
    ).mockImplementation((runId: string) => (state: any) => null)

    render(props)

    expect(screen.getByTestId('lpc-content-container')).toBeInTheDocument()
  })
})
