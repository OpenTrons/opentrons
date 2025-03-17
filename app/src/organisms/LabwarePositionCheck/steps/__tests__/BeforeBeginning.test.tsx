import { vi, describe, expect, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { useSelector } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { MockLPCContentContainer } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { BeforeBeginning } from '/app/organisms/LabwarePositionCheck/steps'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('react-redux', async importOriginal => {
  const actual = await importOriginal<typeof useSelector>()
  return {
    ...actual,
    useSelector: vi.fn(),
  }
})

vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: MockLPCContentContainer,
}))

const render = (props: ComponentProps<typeof BeforeBeginning>) => {
  return renderWithProviders(<BeforeBeginning {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('BeforeBeginning', () => {
  let props: ComponentProps<typeof BeforeBeginning>
  let mockHandleProceed: Mock
  let mockHandleNavToDetachProbe: Mock

  beforeEach(() => {
    mockHandleProceed = vi.fn()
    mockHandleNavToDetachProbe = vi.fn()

    props = {
      ...mockLPCContentProps,
      commandUtils: {
        ...mockLPCContentProps.commandUtils,
        headerCommands: {
          ...mockLPCContentProps.commandUtils.headerCommands,
          handleProceed: mockHandleProceed,
          handleNavToDetachProbe: mockHandleNavToDetachProbe,
        },
      },
    }

    vi.mocked(useSelector).mockReturnValue({
      currentStepIndex: 0,
      totalStepCount: 5,
      protocolName: 'MOCK_PROTOCOL',
    })
  })

  it('passes correct header props to LPCContentContainer', () => {
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute(
      'data-button-text',
      'Move gantry to front'
    )

    const secondaryButton = screen.getByTestId('secondary-button')
    expect(secondaryButton).toHaveAttribute('data-text', 'Exit')
  })

  it('renders appropriate body content', () => {
    render(props)

    screen.getByText('Before you begin')
    screen.getByText(
      'Labware Position Check is a guided workflow that checks labware on the deck for an added degree of precision in your protocol.'
    )
    screen.getByText(
      'To get started, gather the needed equipment shown to the right.'
    )
    screen.getByText('You will need:')
    screen.getByText(
      'All modules and all labware used in the protocol MOCK_PROTOCOL'
    )
    screen.getByText('Calibration Probe')
  })
})
