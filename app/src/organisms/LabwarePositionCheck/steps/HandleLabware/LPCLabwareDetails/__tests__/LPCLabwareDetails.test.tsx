import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, fireEvent, screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  MockLPCContentContainer,
  mockLPCContentProps,
} from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { LPCLabwareDetails } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails'
import { getIsOnDevice } from '/app/redux/config'
import {
  selectSelectedLwOverview,
  selectSelectedLwDisplayName,
  selectWorkingOffsetsByUri,
  selectIsDefaultOffsetAbsent,
  selectStepInfo,
  goBackEditOffsetSubstep,
  applyWorkingOffsets,
  selectIsAnyOffsetHardCoded,
} from '/app/redux/protocol-runs'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/DefaultLocationOffset',
  () => ({
    DefaultLocationOffset: () => <div>MOCK_DEFAULT_LOCATION_OFFSET</div>,
  })
)
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/LocationSpecificOffsetsContainer',
  () => ({
    LocationSpecificOffsetsContainer: () => (
      <div>MOCK_LOCATION_SPECIFIC_OFFSETS_CONTAINER</div>
    ),
  })
)
vi.mock('/app/atoms/InlineNotification', () => ({
  InlineNotification: vi.fn(({ type, heading, message }) => (
    <div
      data-testid="inline-notification"
      data-type={type}
      data-heading={heading}
    >
      {message}
    </div>
  )),
}))
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/UnsavedOffsets',
  () => ({
    handleUnsavedOffsetsModalODD: vi.fn(),
    UnsavedOffsetsDesktop: vi.fn(({ toggleShowUnsavedOffsetsDesktop }) => (
      <div data-testid="unsaved-offsets-desktop">
        Mock Unsaved Offsets Desktop
        <button onClick={toggleShowUnsavedOffsetsDesktop}>Cancel</button>
      </div>
    )),
  })
)
vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: MockLPCContentContainer,
}))
vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: vi.fn(),
  }
})
vi.mock('/app/redux/protocol-runs', () => ({
  selectSelectedLwOverview: vi.fn(),
  selectSelectedLwDisplayName: vi.fn(),
  selectWorkingOffsetsByUri: vi.fn(),
  selectIsDefaultOffsetAbsent: vi.fn(),
  selectCountNonHardcodedLocationSpecificOffsetsForLw: vi.fn(),
  selectIsAnyOffsetHardCoded: vi.fn(),
  selectStepInfo: vi.fn(),
  goBackEditOffsetSubstep: vi.fn(),
  applyWorkingOffsets: vi.fn(),
}))
vi.mock('/app/redux/config', () => ({
  getIsOnDevice: vi.fn(),
}))

const render = (props: ComponentProps<typeof LPCLabwareDetails>) => {
  const mockState = {
    [props.runId]: {
      steps: {
        currentStepIndex: 2,
        totalStepCount: 5,
        protocolName: 'MOCK_PROTOCOL',
      },
    },
  }

  return renderWithProviders(<LPCLabwareDetails {...props} />, {
    i18nInstance: i18n,
    initialState: mockState,
  })[0]
}

describe('LPCLabwareDetails', () => {
  let props: ComponentProps<typeof LPCLabwareDetails>
  let mockDispatch: Mock
  let mockSaveWorkingOffsets: Mock
  let mockToggleInfoBanner: Mock

  beforeEach(() => {
    mockDispatch = vi.fn()
    vi.mocked(useDispatch).mockReturnValue(mockDispatch)
    mockSaveWorkingOffsets = vi.fn(() => Promise.resolve('mock-data'))
    mockToggleInfoBanner = vi.fn()

    props = {
      ...mockLPCContentProps,
      commandUtils: {
        saveWorkingOffsets: mockSaveWorkingOffsets,
        isSavingWorkingOffsetsLoading: false,
      } as any,
      bannerUtils: {
        defaultOffsetInfoBanner: {
          toggleBanner: mockToggleInfoBanner,
          showBanner: false,
        },
      },
    }

    vi.mocked(getIsOnDevice).mockReturnValue(false)

    vi.mocked(
      selectStepInfo
    ).mockImplementation((runId: string) => (state: any) => state[runId]?.steps)
    vi.mocked(selectSelectedLwOverview).mockImplementation(() => () => ({
      uri: 'labware-uri-1',
      id: 'labware-1',
      offsetLocationDetails: null,
    }))
    vi.mocked(selectSelectedLwDisplayName).mockImplementation(() => () =>
      'Test Labware'
    )
    vi.mocked(selectWorkingOffsetsByUri).mockImplementation(() => () =>
      ({
        test: {},
      } as any)
    )
    vi.mocked(selectIsDefaultOffsetAbsent).mockImplementation(() => () => false)
    vi.mocked(selectIsAnyOffsetHardCoded).mockImplementation(() => () => false)
    vi.mocked(goBackEditOffsetSubstep).mockReturnValue({
      type: 'GO_BACK_HANDLE_LW_SUBSTEP',
    } as any)
    vi.mocked(applyWorkingOffsets).mockReturnValue({
      type: 'APPLY_WORKING_OFFSETS',
    } as any)
  })

  it('passes correct header props to LPCContentContainer', () => {
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Test Labware')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Save')
    expect(primaryButton).toHaveAttribute('data-click-handler', 'true')
  })

  it('renders the mocked child components', () => {
    render(props)

    screen.getByText('MOCK_DEFAULT_LOCATION_OFFSET')
    screen.getByText('MOCK_LOCATION_SPECIFIC_OFFSETS_CONTAINER')
  })

  it('shows InlineNotification when default offset is absent', () => {
    vi.mocked(selectIsDefaultOffsetAbsent).mockImplementation(() => () => true)

    render(props)

    const notification = screen.getByTestId('inline-notification')
    expect(notification).toBeInTheDocument()
    expect(notification.getAttribute('data-type')).toBe('alert')
    expect(notification.getAttribute('data-heading')).toBe(
      'Add a default offset to automatically apply it to all placements of this labware on the deck'
    )
    expect(notification.textContent).toBe(
      'Specific slot locations can be adjusted as needed'
    )
  })

  it('does not show the default InlineNotification when default offset is present', () => {
    render(props)

    expect(screen.queryByTestId('inline-notification')).not.toBeInTheDocument()
  })

  it('dispatches actions when save is clicked with working offsets', async () => {
    render(props)

    const primaryButton = screen.getByTestId('primary-button')
    primaryButton.click()

    await act(async () => {
      await expect(mockSaveWorkingOffsets).toHaveBeenCalled()
    })

    expect(mockDispatch).toHaveBeenCalledTimes(2)
    expect(applyWorkingOffsets).toHaveBeenCalledWith(props.runId, 'mock-data')
    expect(goBackEditOffsetSubstep).toHaveBeenCalledWith(props.runId)
  })

  it('shows the hardcoded InlineNotification when there is a hardcoded offset present', () => {
    vi.mocked(selectIsAnyOffsetHardCoded).mockImplementation(() => () => true)

    render(props)

    screen.getByText(
      'Hardcoded offsets must be changed in your Python protocol'
    )
  })

  it('should render the info banner when show banner is true and allow for the user to dismiss it', () => {
    vi.mocked(getIsOnDevice).mockReturnValue(true)

    render({
      ...props,
      bannerUtils: {
        defaultOffsetInfoBanner: {
          toggleBanner: mockToggleInfoBanner,
          showBanner: true,
        },
      },
    })

    const notification = screen.getByTestId('inline-notification')
    expect(notification).toBeInTheDocument()
    expect(notification.getAttribute('data-heading')).toBe(
      'The default offset is used for all placements of the labware unless a manual adjustment is made to specific slot location.'
    )
  })
})
