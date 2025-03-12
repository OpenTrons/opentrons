import { describe, expect, it, beforeEach, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'
import NiceModal from '@ebay/nice-modal-react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { handleUnsavedOffsetsModalODD } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/UnsavedOffsetsModal'
import {
  selectSelectedLwOverview,
  clearSelectedLabwareWorkingOffsets,
  goBackEditOffsetSubstep,
} from '/app/redux/protocol-runs'

vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: vi.fn(),
  }
})
vi.mock('/app/redux/protocol-runs', () => ({
  selectSelectedLwOverview: vi.fn(),
  clearSelectedLabwareWorkingOffsets: vi.fn(),
  goBackEditOffsetSubstep: vi.fn(),
}))
vi.mock('/app/molecules/OddModal', () => ({
  OddModal: vi.fn(({ header, children }) => (
    <div data-testid="mock-odd-modal" data-title={header.title}>
      <div data-testid="modal-content">{children}</div>
    </div>
  )),
}))
vi.mock('/app/atoms/buttons', () => ({
  SmallButton: vi.fn(({ buttonText, onClick, buttonType }) => (
    <button
      data-testid={`mock-button-${buttonType || 'default'}`}
      onClick={onClick}
    >
      {buttonText}
    </button>
  )),
}))

const render = () => {
  return renderWithProviders(
    <NiceModal.Provider>
      <button
        onClick={() => handleUnsavedOffsetsModalODD(mockLPCContentProps)}
        data-testid="test-trigger-button"
      >
        Open Modal
      </button>
    </NiceModal.Provider>,
    {
      i18nInstance: i18n,
    }
  )
}

describe('UnsavedOffsetsModal', () => {
  let mockDispatch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockDispatch = vi.fn()
    vi.mocked(useDispatch).mockReturnValue(mockDispatch)

    vi.mocked(selectSelectedLwOverview).mockImplementation(() => () => ({
      uri: 'test-labware-uri',
      id: 'test-id',
      offsetLocationDetails: null,
    }))

    vi.mocked(clearSelectedLabwareWorkingOffsets).mockReturnValue({
      type: 'CLEAR_WORKING_OFFSETS',
    } as any)
    vi.mocked(goBackEditOffsetSubstep).mockReturnValue({
      type: 'GO_BACK_HANDLE_LW_SUBSTEP',
    } as any)
  })

  it('renders the modal with the correct title when triggered', () => {
    render()

    const triggerButton = screen.getByTestId('test-trigger-button')
    fireEvent.click(triggerButton)

    const modal = screen.getByTestId('mock-odd-modal')
    expect(modal).toBeInTheDocument()
    expect(modal).toHaveAttribute('data-title', 'Unsaved changes will be lost')
  })

  it('renders the confirmation message and buttons', () => {
    render()

    const triggerButton = screen.getByTestId('test-trigger-button')
    fireEvent.click(triggerButton)

    const modalContent = screen.getByTestId('modal-content')
    expect(modalContent).toHaveTextContent(
      'Are you sure you want to go back to the the labware list without saving?'
    )

    screen.getByText('Cancel')
    screen.getByText('Confirm')
  })

  it('dispatches actions and closes the modal when Confirm is clicked', () => {
    render()

    const triggerButton = screen.getByTestId('test-trigger-button')
    fireEvent.click(triggerButton)

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    expect(clearSelectedLabwareWorkingOffsets).toHaveBeenCalledWith(
      mockLPCContentProps.runId,
      'test-labware-uri'
    )
    expect(goBackEditOffsetSubstep).toHaveBeenCalledWith(
      mockLPCContentProps.runId
    )
    expect(mockDispatch).toHaveBeenCalledTimes(2)
  })

  it('closes the modal without dispatching actions when Cancel is clicked', () => {
    render()

    const triggerButton = screen.getByTestId('test-trigger-button')
    fireEvent.click(triggerButton)

    const cancelButton = screen.getByText('Cancel')
    fireEvent.click(cancelButton)

    expect(mockDispatch).not.toHaveBeenCalled()
  })

  it('handles the case when no labware URI is available', () => {
    vi.mocked(selectSelectedLwOverview).mockImplementation(() => () => null)

    render()

    const triggerButton = screen.getByTestId('test-trigger-button')
    fireEvent.click(triggerButton)

    const confirmButton = screen.getByText('Confirm')
    fireEvent.click(confirmButton)

    expect(clearSelectedLabwareWorkingOffsets).toHaveBeenCalledWith(
      mockLPCContentProps.runId,
      ''
    )
    expect(goBackEditOffsetSubstep).toHaveBeenCalledWith(
      mockLPCContentProps.runId
    )
  })
})
