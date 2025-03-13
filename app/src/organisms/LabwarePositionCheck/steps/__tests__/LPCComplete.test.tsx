import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'
import { LPCComplete } from '/app/organisms/LabwarePositionCheck/steps'
import { clickButtonLabeled } from '/app/organisms/LabwarePositionCheck/__tests__/utils'
import { selectStepInfo } from '/app/redux/protocol-runs'

import SuccessIcon from '/app/assets/images/icon_success.png'

import type { ComponentProps } from 'react'
import type { Mock } from 'vitest'

vi.mock('/app/redux/protocol-runs')

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
  let mockHandleClose: Mock

  beforeEach(() => {
    mockHandleClose = vi.fn()

    vi.mocked(
      selectStepInfo
    ).mockImplementation((runId: string) => (state: any) => state[runId]?.steps)

    props = {
      ...mockLPCContentProps,
      commandUtils: {
        ...mockLPCContentProps.commandUtils,
        headerCommands: {
          ...mockLPCContentProps.commandUtils.headerCommands,
          handleCloseAndHome: mockHandleClose,
        },
      },
    }
  })

  it('renders appropriate header content and onClick behavior', () => {
    render(props)

    screen.getByText('Labware Position Check')
    screen.getByText('Exit')

    clickButtonLabeled('Exit')
    expect(mockHandleClose).toHaveBeenCalled()
  })

  it('renders appropriate body content', () => {
    render(props)

    screen.getByText('Labware Position Check complete')

    const successIcon = screen.getByAltText('Success Icon')
    expect(successIcon).toBeInTheDocument()
    expect(successIcon).toHaveAttribute('src', SuccessIcon)
  })
})
