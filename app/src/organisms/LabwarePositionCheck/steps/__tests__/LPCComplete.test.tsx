import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { MockLPCContentContainer } from '/app/organisms/LabwarePositionCheck/__fixtures__'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { LPCComplete } from '/app/organisms/LabwarePositionCheck/steps'
import { getIsOnDevice } from '/app/redux/config'
import { selectStepInfo } from '/app/redux/protocol-runs'

import SuccessIcon from '/app/assets/images/icon_success.png'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/organisms/LabwarePositionCheck/LPCContentContainer', () => ({
  LPCContentContainer: MockLPCContentContainer,
}))

vi.mock('/app/redux/protocol-runs')
vi.mock('/app/redux/config')

const render = (props: ComponentProps<typeof LPCComplete>) => {
  const mockState = {
    [props.runId]: {
      steps: {
        currentStepIndex: 4,
        totalStepCount: 5,
        protocolName: 'MOCK_PROTOCOL',
      },
    },
  }

  return renderWithProviders(<LPCComplete {...props} />, {
    i18nInstance: i18n,
    initialState: mockState,
  })[0]
}

describe('LPCComplete', () => {
  let props: ComponentProps<typeof LPCComplete>
  let mockHandleCloseAndHome: Mock

  beforeEach(() => {
    mockHandleCloseAndHome = vi.fn()

    vi.mocked(
      selectStepInfo
    ).mockImplementation((runId: string) => (state: any) => state[runId]?.steps)

    vi.mocked(getIsOnDevice).mockReturnValue(false)

    props = {
      ...mockLPCContentProps,
      commandUtils: {
        ...mockLPCContentProps.commandUtils,
        headerCommands: {
          ...mockLPCContentProps.commandUtils.headerCommands,
          handleCloseAndHome: mockHandleCloseAndHome,
        },
      },
    }
  })

  it('passes correct header props to LPCContentContainer', () => {
    render(props)

    const header = screen.getByTestId('header-prop')
    expect(header).toHaveTextContent('Labware Position Check')

    const primaryButton = screen.getByTestId('primary-button')
    expect(primaryButton).toHaveAttribute('data-button-text', 'Exit')
    expect(primaryButton).toHaveAttribute('data-click-handler', 'true')
  })

  it('renders appropriate body content', () => {
    render(props)

    screen.getByText('Labware Position Check complete')

    const successIcon = screen.getByAltText('Success Icon')
    expect(successIcon).toBeInTheDocument()
    expect(successIcon).toHaveAttribute('src', SuccessIcon)
  })
})
