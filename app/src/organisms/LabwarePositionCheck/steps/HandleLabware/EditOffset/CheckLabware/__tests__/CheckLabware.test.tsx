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
  LPCContentContainer: MockLPCContentContainer,
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
  let mockResetJog: Mock
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
    mockResetJog = vi.fn().mockResolvedValue(undefined)
    mockHandleResetLwModulesOnDeck = vi.fn().mockResolvedValue(undefined)

    props = {
      runId: 'test-run-id',
      contentHeader: 'Test Content Header',
      commandUtils: {
        toggleRobotMoving: mockToggleRobotMoving,
        handleConfirmLwFinalPosition: mockHandleConfirmLwFinalPosition,
        handleJog: mockHandleJog,
        resetJog: mockResetJog,
        handleResetLwModulesOnDeck: mockHandleResetLwModulesOnDeck,
      } as any,
      handleAddConfirmedWorkingVector: vi.fn(),
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

  it('passes correct header props to LPCContentContainer for desktop', () => {
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

  it('passes correct header props to LPCContentContainer for ODD', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
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

  it('renders the labware jog component', () => {
    render(props)
    expect(screen.getByTestId('mock-labware-jog')).toBeInTheDocument()
  })

  it('dispatches proceedEditOffsetSubstep on desktop when confirm is clicked', () => {
    render(props)

    const primaryButton = screen.getByTestId('primary-button')
    primaryButton.click()

    expect(mockDispatch).toHaveBeenCalledWith(
      proceedEditOffsetSubstep(props.runId, true)
    )
  })

  it('calls handleAddConfirmedWorkingVector on ODD when confirm is clicked', async () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)

    const primaryButton = screen.getByTestId('primary-button')
    primaryButton.click()

    expect(props.handleAddConfirmedWorkingVector).toHaveBeenCalled()
  })
})
