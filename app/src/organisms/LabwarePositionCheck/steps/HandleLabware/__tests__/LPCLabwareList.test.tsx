import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { mockLabwareInfo } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { LPCLabwareList } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareList'
import { clickButtonLabeled } from '/app/organisms/LabwarePositionCheck/__tests__/utils'
import {
  selectAllLabwareInfo,
  selectIsDefaultOffsetAbsent,
  selectCountLocationSpecificOffsetsForLw,
  selectStepInfo,
  setSelectedLabwareUri,
  proceedEditOffsetSubstep,
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

vi.mock('/app/redux/protocol-runs', () => ({
  selectAllLabwareInfo: vi.fn(),
  selectIsDefaultOffsetAbsent: vi.fn(),
  selectCountLocationSpecificOffsetsForLw: vi.fn(),
  selectStepInfo: vi.fn(),
  setSelectedLabwareUri: vi.fn(),
  proceedEditOffsetSubstep: vi.fn(),
}))

const render = (props: ComponentProps<typeof LPCLabwareList>) => {
  const mockState = {
    [props.runId]: {
      steps: {
        currentStepIndex: 2,
        totalStepCount: 5,
        protocolName: 'MOCK_PROTOCOL',
      },
      lpc: {
        labwareInfo: {
          labware: mockLabwareInfo,
        },
      },
    },
  }

  return renderWithProviders(<LPCLabwareList {...props} />, {
    i18nInstance: i18n,
    initialState: mockState,
  })[0]
}

describe('LPCLabwareList', () => {
  let props: ComponentProps<typeof LPCLabwareList>
  let mockHandleNavToDetachProbe: Mock
  let mockDispatch: Mock

  beforeEach(() => {
    mockHandleNavToDetachProbe = vi.fn()
    mockDispatch = vi.fn()

    vi.mocked(useDispatch).mockReturnValue(mockDispatch)

    props = {
      ...mockLPCContentProps,
      commandUtils: {
        ...mockLPCContentProps.commandUtils,
        headerCommands: {
          ...mockLPCContentProps.commandUtils.headerCommands,
          handleNavToDetachProbe: mockHandleNavToDetachProbe,
        },
      },
    }

    // Mock the action creators
    vi.mocked(setSelectedLabwareUri).mockReturnValue({
      type: 'SET_SELECTED_LABWARE_URI',
    } as any)
    vi.mocked(proceedEditOffsetSubstep).mockReturnValue({
      type: 'PROCEED_EDIT_OFFSET_SUBSTEP',
    } as any)

    // Make sure we properly mock the selectors to use our state correctly
    vi.mocked(
      selectStepInfo
    ).mockImplementation((runId: string) => (state: any) => state[runId]?.steps)

    // This is the critical change - make sure it correctly returns the mockLabwareInfo
    vi.mocked(
      selectAllLabwareInfo
    ).mockImplementation((runId: string) => (state: any) => mockLabwareInfo)

    vi.mocked(
      selectIsDefaultOffsetAbsent
    ).mockImplementation((runId: string, uri: string) => (state: any) =>
      uri === 'labware-uri-1'
    )

    vi.mocked(
      selectCountLocationSpecificOffsetsForLw
    ).mockImplementation((runId: string, uri: string) => (state: any) =>
      uri === 'labware-uri-2' ? 2 : 1
    )
  })

  it('renders appropriate header content and onClick behavior', () => {
    render(props)

    screen.getByText('Labware Position Check')
    screen.getByText('Exit')

    clickButtonLabeled('Exit')
    expect(mockHandleNavToDetachProbe).toHaveBeenCalled()
  })

  it('renders all labware items', () => {
    render(props)

    screen.getByText('Select a labware to view its stored offset data.')
    screen.getByText('Labware 1')
    screen.getByText('Labware 2')
  })

  it('shows correct offset message for labware with one offset', () => {
    vi.mocked(
      selectIsDefaultOffsetAbsent
    ).mockImplementation((runId: any, uri: any) => (state: any) => false)
    vi.mocked(
      selectCountLocationSpecificOffsetsForLw
    ).mockImplementation((runId: any, uri: any) => (state: any) => 1)

    render(props)

    screen.getByText('Labware 1')
  })

  it('handles labware item click correctly', () => {
    render(props)

    const labware1Item = screen.getByText('Labware 1')
    fireEvent.click(labware1Item)

    expect(mockDispatch).toHaveBeenCalledTimes(2)
    expect(setSelectedLabwareUri).toHaveBeenCalledWith(
      props.runId,
      'labware-uri-1'
    )
    expect(proceedEditOffsetSubstep).toHaveBeenCalledWith(props.runId)
  })

  it('shows "one missing offset" message when default offset is absent', () => {
    render(props)

    screen.getByText('Labware 1')
    screen.getByText('1 missing offset')
  })

  it('shows multiple offsets message correctly', () => {
    vi.mocked(
      selectIsDefaultOffsetAbsent
    ).mockImplementation((runId: any, uri: any) => (state: any) => false)

    render(props)

    screen.getByText('Labware 2')
    screen.getByText('2 offsets')
  })

  it('shows multiple missing offsets message correctly', () => {
    vi.mocked(
      selectIsDefaultOffsetAbsent
    ).mockImplementation((runId: any, uri: any) => (state: any) => true)
    vi.mocked(
      selectCountLocationSpecificOffsetsForLw
    ).mockImplementation((runId: any, uri: any) => (state: any) => 3)

    render(props)

    screen.getByText('Labware 2')
    expect(screen.getAllByText('3 missing offsets')[0]).toBeInTheDocument()
  })
})
