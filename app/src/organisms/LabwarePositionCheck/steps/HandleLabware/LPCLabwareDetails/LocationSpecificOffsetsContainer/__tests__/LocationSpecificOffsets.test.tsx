import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  mockLPCContentProps,
  mockLocationSpecificOffsetDetails,
} from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { LocationSpecificOffsetsContainer } from '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/LocationSpecificOffsetsContainer'
import { selectSelectedLwLocationSpecificOffsetDetails } from '/app/redux/protocol-runs'

import type { ComponentProps } from 'react'

vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/LocationSpecificOffsetsContainer/LabwareLocationItem',
  () => ({
    LabwareLocationItem: ({ slotCopy }: { slotCopy: string }) => (
      <div data-testid={`location-item-${slotCopy}`}>Labware in {slotCopy}</div>
    ),
  })
)
vi.mock(
  '/app/organisms/LabwarePositionCheck/steps/HandleLabware/LPCLabwareDetails/LocationSpecificOffsetsContainer/OffsetTableHeaders',
  () => ({
    OffsetTableHeaders: () => (
      <div data-testid="offset-table-headers">Headers</div>
    ),
  })
)
vi.mock('/app/redux/protocol-runs', () => ({
  selectSelectedLwLocationSpecificOffsetDetails: vi.fn(),
}))

const render = (
  props: ComponentProps<typeof LocationSpecificOffsetsContainer>
) => {
  const mockState = {
    protocolRuns: {
      [props.runId]: {
        lpc: {
          protocolData: {
            modules: {},
            labware: {},
          },
        },
      },
    },
  }

  return renderWithProviders(<LocationSpecificOffsetsContainer {...props} />, {
    i18nInstance: i18n,
    initialState: mockState,
  })[0]
}

describe('LocationSpecificOffsetsContainer', () => {
  let props: ComponentProps<typeof LocationSpecificOffsetsContainer>

  beforeEach(() => {
    props = {
      ...mockLPCContentProps,
    }

    vi.mocked(
      selectSelectedLwLocationSpecificOffsetDetails
    ).mockImplementation((runId: string) => () =>
      mockLocationSpecificOffsetDetails
    )
  })

  it('renders the header text', () => {
    render(props)
    screen.getByText('Applied Location Offsets')
  })

  it('renders the OffsetTableHeaders', () => {
    render(props)
    expect(screen.getByTestId('offset-table-headers')).toBeInTheDocument()
  })

  it('renders a LabwareLocationItem for each offset', () => {
    render(props)
    expect(screen.getByTestId('location-item-C1')).toBeInTheDocument()
    expect(screen.getByTestId('location-item-A2')).toBeInTheDocument()
    expect(screen.getByTestId('location-item-B3')).toBeInTheDocument()
  })

  it('sorts the offsets alphanumerically by slot', () => {
    render(props)

    const items = screen.getAllByTestId(/^location-item-/)
    expect(items[0]).toHaveTextContent('A2')
    expect(items[1]).toHaveTextContent('B3')
    expect(items[2]).toHaveTextContent('C1')
  })

  it('correctly passes slotCopy to LabwareLocationItem', () => {
    render(props)

    screen.getByText('Labware in A2')
    screen.getByText('Labware in B3')
    screen.getByText('Labware in C1')
  })
})
