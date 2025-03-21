import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  MockLPCContentContainer,
  mockLabwareInfo,
} from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { LPCLabwareList } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareList'
import { getIsOnDevice } from '/app/redux/config'
import {
  selectIsDefaultOffsetAbsent,
  selectStepInfo,
  setSelectedLabwareUri,
  selectIsNecessaryDefaultOffsetMissing,
  proceedEditOffsetSubstep,
  selectAllLabwareInfoAndDefaultStatusSorted,
  selectTotalOrMissingOffsetRequiredCountForLwCopy,
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

vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: MockLPCContentContainer,
}))

vi.mock('/app/redux/config')

vi.mock('/app/redux/protocol-runs', () => ({
  selectAllLabwareInfoAndDefaultStatusSorted: vi.fn(),
  selectIsDefaultOffsetAbsent: vi.fn(),
  selectIsNecessaryDefaultOffsetMissing: vi.fn(),
  selectCountLocationSpecificOffsetsForLw: vi.fn(),
  selectStepInfo: vi.fn(),
  setSelectedLabwareUri: vi.fn(),
  proceedEditOffsetSubstep: vi.fn(),
  selectCountNonHardcodedLocationSpecificOffsetsForLw: vi.fn(),
  selectTotalOrMissingOffsetRequiredCountForLwCopy: vi.fn(),
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
    vi.mocked(getIsOnDevice).mockReturnValue(false)

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

    vi.mocked(setSelectedLabwareUri).mockReturnValue({
      type: 'SET_SELECTED_LABWARE_URI',
    } as any)
    vi.mocked(proceedEditOffsetSubstep).mockReturnValue({
      type: 'PROCEED_EDIT_OFFSET_SUBSTEP',
    } as any)

    vi.mocked(
      selectStepInfo
    ).mockImplementation((runId: string) => (state: any) => state[runId]?.steps)

    vi.mocked(
      selectIsDefaultOffsetAbsent
    ).mockImplementation((runId: string, uri: string) => (state: any) =>
      uri === 'labware-uri-1'
    )

    vi.mocked(
      selectIsNecessaryDefaultOffsetMissing
    ).mockImplementation((runId: string, uri: string) => (state: any) =>
      uri === 'labware-uri-1'
    )

    vi.mocked(selectAllLabwareInfoAndDefaultStatusSorted).mockImplementation(
      (runId: string) => () =>
        [
          { uri: 'mock-uri-1', info: { displayName: 'Labware 1' } },
          { uri: 'mock-uri-2', info: { displayName: 'Labware 2' } },
        ] as any
    )

    vi.mocked(
      selectTotalOrMissingOffsetRequiredCountForLwCopy
    ).mockImplementation((runId: string) => () => 'all good')
  })

  it('passes correct header props to LPCContentContainer for desktop', () => {
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Continue')
    expect(primaryButton).toHaveAttribute('data-click-handler', 'true')
  })

  it('passes correct header props to LPCContentContainer for ODD', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Exit')
    expect(primaryButton).toHaveAttribute('data-click-handler', 'true')
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
      selectIsNecessaryDefaultOffsetMissing
    ).mockImplementation((runId: any, uri: any) => (state: any) => false)

    render(props)

    screen.getByText('Labware 1')
  })
})
