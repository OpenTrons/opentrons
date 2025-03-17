import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { HandleLabware } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware'
import {
  selectCurrentSubstep,
  HANDLE_LW_SUBSTEP,
} from '/app/redux/protocol-runs'

import type { ComponentProps } from 'react'

vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareList',
  () => ({
    LPCLabwareList: () => (
      <div data-testid="mock-labware-list">Mock Labware List</div>
    ),
  })
)
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails',
  () => ({
    LPCLabwareDetails: () => (
      <div data-testid="mock-labware-details">Mock Labware Details</div>
    ),
  })
)
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/EditOffset',
  () => ({
    EditOffset: () => (
      <div data-testid="mock-edit-offset">Mock Edit Offset</div>
    ),
  })
)

vi.mock('/app/redux/protocol-runs', () => ({
  selectCurrentSubstep: vi.fn(),
  HANDLE_LW_SUBSTEP: {
    LIST: 'handle-lw/list',
    DETAILS: 'handle-lw/details',
    EDIT_OFFSET_PREP_LW: 'handle-lw/edit-offset/prepare-labware',
    EDIT_OFFSET_CHECK_LW: 'handle-lw/edit-offset/check-labware',
  },
}))

const render = (props: ComponentProps<typeof HandleLabware>) => {
  return renderWithProviders(<HandleLabware {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('HandleLabware', () => {
  let props: ComponentProps<typeof HandleLabware>

  beforeEach(() => {
    props = {
      ...mockLPCContentProps,
    }

    vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
      HANDLE_LW_SUBSTEP.LIST
    )
  })

  it('renders LPCLabwareList when on list substep', () => {
    vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
      HANDLE_LW_SUBSTEP.LIST
    )

    render(props)

    screen.getByTestId('mock-labware-list')
    expect(screen.queryByTestId('mock-labware-details')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-edit-offset')).not.toBeInTheDocument()
  })

  it('renders LPCLabwareDetails when on details substep', () => {
    vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
      HANDLE_LW_SUBSTEP.DETAILS
    )

    render(props)

    screen.getByTestId('mock-labware-details')
    expect(screen.queryByTestId('mock-labware-list')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-edit-offset')).not.toBeInTheDocument()
  })

  it('renders EditOffset when on prepare labware substep', () => {
    vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
      HANDLE_LW_SUBSTEP.EDIT_OFFSET_PREP_LW
    )

    render(props)

    screen.getByTestId('mock-edit-offset')
    expect(screen.queryByTestId('mock-labware-list')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-labware-details')).not.toBeInTheDocument()
  })

  it('renders EditOffset when on check labware substep', () => {
    vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
      HANDLE_LW_SUBSTEP.EDIT_OFFSET_CHECK_LW
    )

    render(props)

    screen.getByTestId('mock-edit-offset')
    expect(screen.queryByTestId('mock-labware-list')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-labware-details')).not.toBeInTheDocument()
  })

  it('falls back to LPCLabwareList for unknown substep', () => {
    vi.mocked(selectCurrentSubstep).mockImplementation(() => () =>
      'unknown-substep' as any
    )

    render(props)

    screen.getByTestId('mock-labware-list')
    expect(screen.queryByTestId('mock-labware-details')).not.toBeInTheDocument()
    expect(screen.queryByTestId('mock-edit-offset')).not.toBeInTheDocument()
  })
})
