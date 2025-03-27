import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useDispatch } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { MockLPCContentContainer } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { UnsavedOffsetsDesktop } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/UnsavedOffsets'
import {
  clearSelectedLabwareWorkingOffsets,
  goBackEditOffsetSubstep,
  selectSelectedLwOverview,
} from '/app/redux/protocol-runs'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('react-redux', async () => {
  const actual = await vi.importActual('react-redux')
  return {
    ...actual,
    useDispatch: vi.fn(),
    useSelector: vi.fn(),
  }
})

vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: MockLPCContentContainer,
}))

vi.mock('/app/redux/protocol-runs', () => ({
  clearSelectedLabwareWorkingOffsets: vi.fn(),
  goBackEditOffsetSubstep: vi.fn(),
  selectSelectedLwOverview: vi.fn(),
}))

const render = (props: ComponentProps<typeof UnsavedOffsetsDesktop>) => {
  return renderWithProviders(<UnsavedOffsetsDesktop {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('UnsavedOffsetsDesktop', () => {
  let props: ComponentProps<typeof UnsavedOffsetsDesktop>
  let mockToggleShowUnsavedOffsetsDesktop: Mock
  let mockDispatch: Mock

  beforeEach(() => {
    mockToggleShowUnsavedOffsetsDesktop = vi.fn()
    mockDispatch = vi.fn()

    vi.mocked(useDispatch).mockReturnValue(mockDispatch)

    vi.mocked(selectSelectedLwOverview).mockImplementation(
      (runId: string) => (state: any) =>
        ({
          uri: 'test-labware-uri',
          displayName: 'Test Labware',
        } as any)
    )

    vi.mocked(clearSelectedLabwareWorkingOffsets).mockReturnValue({
      type: 'CLEAR_SELECTED_LABWARE_WORKING_OFFSETS',
    } as any)

    vi.mocked(goBackEditOffsetSubstep).mockReturnValue({
      type: 'GO_BACK_EDIT_OFFSET_SUBSTEP',
    } as any)

    props = {
      ...mockLPCContentProps,
      toggleShowUnsavedOffsetsDesktop: mockToggleShowUnsavedOffsetsDesktop,
    }
  })

  it('passes correct header props to LPCContentContainer', () => {
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Confirm')
    expect(primaryButton).toHaveAttribute('data-click-handler', 'true')
  })

  it('renders appropriate warning content', () => {
    render(props)

    screen.getByText('Unsaved changes will be lost')
    screen.getByText(
      'Are you sure you want to go back to the the labware list without saving?'
    )
  })

  it('dispatches actions when primary button is clicked', () => {
    render(props)

    const primaryButton = screen.getByTestId('primary-button')
    primaryButton.click()

    expect(mockDispatch).toHaveBeenCalledTimes(2)
    expect(clearSelectedLabwareWorkingOffsets).toHaveBeenCalled()
    expect(goBackEditOffsetSubstep).toHaveBeenCalledWith(props.runId)
  })
})
