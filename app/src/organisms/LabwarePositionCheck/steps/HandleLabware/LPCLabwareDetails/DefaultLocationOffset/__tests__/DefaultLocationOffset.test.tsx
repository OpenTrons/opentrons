import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockLPCContentProps,
  mockOffset,
  mockDefaultOffsetDetails,
} from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { DefaultLocationOffset } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/DefaultLocationOffset'
import {
  selectSelectedLwDefaultOffsetDetails,
  selectMostRecentVectorOffsetForLwWithOffsetDetails,
  setSelectedLabware,
  proceedEditOffsetSubstep,
} from '/app/redux/protocol-runs'
import { OffsetTag } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: vi.fn(),
  }
})
vi.mock('/app/organisms/LabwarePositionCheck/steps/HandleLabware/OffsetTag')
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/DefaultLocationOffset/ManageDefaultOffsetBtn',
  () => ({
    // @ts-expect-error Testing only.
    ManageDefaultOffsetBtn: ({ isMissingDefaultOffset, onClick }) => (
      <button
        data-testid={`manage-default-offset-${
          isMissingDefaultOffset ? 'missing' : 'exists'
        }`}
        onClick={onClick}
      >
        {isMissingDefaultOffset ? 'Add' : 'Adjust'}
      </button>
    ),
  })
)
vi.mock('/app/redux/protocol-runs', () => ({
  selectSelectedLwDefaultOffsetDetails: vi.fn(),
  selectMostRecentVectorOffsetForLwWithOffsetDetails: vi.fn(),
  setSelectedLabware: vi.fn(),
  proceedEditOffsetSubstep: vi.fn(),
}))

const render = (props: ComponentProps<typeof DefaultLocationOffset>) => {
  const mockState = {
    [props.runId]: {
      steps: {
        currentStepIndex: 2,
        totalStepCount: 5,
        protocolName: 'MOCK_PROTOCOL',
      },
    },
  }

  return renderWithProviders(<DefaultLocationOffset {...props} />, {
    i18nInstance: i18n,
    initialState: mockState,
  })[0]
}

describe('DefaultLocationOffset', () => {
  let props: ComponentProps<typeof DefaultLocationOffset>
  let mockDispatch: Mock

  beforeEach(() => {
    mockDispatch = vi.fn()
    vi.mocked(useDispatch).mockReturnValue(mockDispatch)

    props = {
      ...mockLPCContentProps,
    }

    vi.mocked(OffsetTag).mockReturnValue(<div>MOCK_OFFSET_TAG</div>)
    vi.mocked(setSelectedLabware).mockReturnValue({
      type: 'SET_SELECTED_LABWARE',
    } as any)
    vi.mocked(proceedEditOffsetSubstep).mockReturnValue({
      type: 'PROCEED_EDIT_OFFSET_SUBSTEP',
    } as any)
    vi.mocked(
      selectSelectedLwDefaultOffsetDetails
    ).mockImplementation((runId: string) => () => mockDefaultOffsetDetails)

    vi.mocked(
      selectMostRecentVectorOffsetForLwWithOffsetDetails
    ).mockImplementation(() => () => null)
  })

  it('renders with default labware offset title', () => {
    render(props)
    screen.getByText('Default Labware Offset')
  })

  it('renders no offset tag when no offset exists', () => {
    render(props)
    screen.getByText('MOCK_OFFSET_TAG')
  })

  it('dispatches correct actions when Add button is clicked', () => {
    render(props)

    const addButton = screen.getByTestId('manage-default-offset-missing')
    fireEvent.click(addButton)

    expect(mockDispatch).toHaveBeenCalledTimes(2)
    expect(setSelectedLabware).toHaveBeenCalledWith(
      props.runId,
      'def-uri-1',
      mockDefaultOffsetDetails.locationDetails
    )
    expect(proceedEditOffsetSubstep).toHaveBeenCalledWith(props.runId)
  })

  it('renders offset tag when offset exists', () => {
    vi.mocked(
      selectMostRecentVectorOffsetForLwWithOffsetDetails
    ).mockImplementation(() => () => mockOffset as any)

    render(props)

    screen.getByText('MOCK_OFFSET_TAG')
  })

  it('shows Adjust button when offset exists', () => {
    vi.mocked(
      selectMostRecentVectorOffsetForLwWithOffsetDetails
    ).mockImplementation(() => () => mockOffset as any)

    render(props)

    expect(
      screen.getByTestId('manage-default-offset-exists')
    ).toBeInTheDocument()
    screen.getByText('Adjust')
  })

  it('dispatches correct actions when Adjust button is clicked', () => {
    vi.mocked(
      selectMostRecentVectorOffsetForLwWithOffsetDetails
    ).mockImplementation(() => () => mockOffset as any)

    render(props)

    const adjustButton = screen.getByTestId('manage-default-offset-exists')
    fireEvent.click(adjustButton)

    expect(mockDispatch).toHaveBeenCalledTimes(2)
    expect(setSelectedLabware).toHaveBeenCalledWith(
      props.runId,
      'def-uri-1',
      mockDefaultOffsetDetails.locationDetails
    )
    expect(proceedEditOffsetSubstep).toHaveBeenCalledWith(props.runId)
  })
})
