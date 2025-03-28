import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import {
  MockLPCContentContainer,
  mockLPCContentProps,
} from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { LPCFatalError } from '/app/organisms/LabwarePositionCheck/LPCFatalError'
import { getIsOnDevice } from '/app/redux/config'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'
import type { useSelector } from 'react-redux'

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

vi.mock('/app/redux/config', () => ({
  getIsOnDevice: vi.fn(),
}))

const render = (props: ComponentProps<typeof LPCFatalError>) => {
  return renderWithProviders(<LPCFatalError {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('LPCFatalError', () => {
  let props: ComponentProps<typeof LPCFatalError>
  let mockHandleCloseWithoutHome: Mock

  beforeEach(() => {
    mockHandleCloseWithoutHome = vi.fn()
    vi.mocked(getIsOnDevice).mockReturnValue(false)

    props = {
      ...mockLPCContentProps,
      commandUtils: {
        ...mockLPCContentProps.commandUtils,
        headerCommands: {
          ...mockLPCContentProps.commandUtils.headerCommands,
          handleCloseWithoutHome: mockHandleCloseWithoutHome,
        },
      },
    }
  })

  it('passes correct header props to LPCContentContainer for desktop', () => {
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Exit')
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

  it('renders appropriate error content', () => {
    render(props)

    screen.getByText('Something went wrong')
    screen.getByText(
      'First, remove the calibration probe before exiting. Then, restart Labware Position Check to continue.'
    )
  })

  it('handles exit button click correctly', () => {
    render(props)

    const primaryButton = screen.getByTestId('primary-button')
    primaryButton.click()

    expect(mockHandleCloseWithoutHome).toHaveBeenCalled()
  })
})
