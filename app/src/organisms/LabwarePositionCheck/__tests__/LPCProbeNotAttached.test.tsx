import { vi, describe, expect, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { useSelector } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { MockLPCContentContainer } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { LPCProbeNotAttached } from '/app/organisms/LabwarePositionCheck/LPCProbeNotAttached'

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

const render = (props: ComponentProps<typeof LPCProbeNotAttached>) => {
  return renderWithProviders(<LPCProbeNotAttached {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('LPCProbeNotAttached', () => {
  let props: ComponentProps<typeof LPCProbeNotAttached>
  let mockHandleAttachProbeCheck: Mock
  let mockHandleNavToDetachProbe: Mock

  beforeEach(() => {
    mockHandleAttachProbeCheck = vi.fn()
    mockHandleNavToDetachProbe = vi.fn()

    props = {
      ...mockLPCContentProps,
      commandUtils: {
        ...mockLPCContentProps.commandUtils,
        headerCommands: {
          ...mockLPCContentProps.commandUtils.headerCommands,
          handleAttachProbeCheck: mockHandleAttachProbeCheck,
          handleNavToDetachProbe: mockHandleNavToDetachProbe,
        },
      },
    }

    vi.mocked(useSelector).mockReturnValue({
      currentStepIndex: 1,
      totalStepCount: 5,
    })
  })

  it('passes correct header props to LPCContentContainer', () => {
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Try again')
    expect(primaryButton).toHaveAttribute('data-click-handler', 'true')

    const secondaryButton = screen.getByTestId('secondary-button')
    expect(secondaryButton).toHaveAttribute('data-text', 'Exit')
  })

  it('renders appropriate body content and alert icon', () => {
    render(props)

    screen.getByText('Calibration probe not detected')
    screen.getByText('Ensure it is properly attached before proceeding.')
  })
})
