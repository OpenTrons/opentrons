import { vi, describe, expect, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { useSelector } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { BeforeBeginning } from '/app/organisms/LabwarePositionCheck/steps'
import { clickButtonLabeled } from '/app/organisms/LabwarePositionCheck/__tests__/utils'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('react-redux', async importOriginal => {
  const actual = await importOriginal<typeof useSelector>()
  return {
    ...actual,
    useSelector: vi.fn(),
  }
})

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

  it('renders appropriate header content and onClick behavior', () => {
    render(props)

    screen.getByText('Labware Position Check')
    screen.getByText('Exit')
    screen.getByText('Move gantry to front')

    const progressBar = screen.getByTestId('StepMeter_StepMeterBar')
    expect(progressBar).toHaveStyle('width: 20%')

    clickButtonLabeled('Move gantry to front')
    expect(mockHandleProceed).toHaveBeenCalled()

    clickButtonLabeled('Exit')
    expect(mockHandleNavToDetachProbe).toHaveBeenCalled()
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
