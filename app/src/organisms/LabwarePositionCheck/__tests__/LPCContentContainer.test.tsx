import { describe, beforeEach, afterEach, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { useSelector } from 'react-redux'

import { renderWithProviders } from '/app/__testing-utils__'
import { i18n } from '/app/i18n'
import { LPCContentContainer } from '/app/organisms/LabwarePositionCheck/LPCContentContainer'
// eslint-disable-next-line opentrons/no-imports-across-applications
import { ChildNavigation } from '/app/organisms/ODD/ChildNavigation'
import { StepMeter } from '/app/atoms/StepMeter'
import { mockLPCContentProps } from '/app/organisms/LabwarePositionCheck/__fixtures__/mockLPCContentProps'

import type { ComponentProps } from 'react'

vi.mock('react-redux', async importOriginal => {
  const actual = await importOriginal<typeof useSelector>()
  return {
    ...actual,
    useSelector: vi.fn(),
  }
})
vi.mock('/app/organisms/ODD/ChildNavigation')
vi.mock('/app/atoms/StepMeter')

const render = (props: ComponentProps<typeof LPCContentContainer>) => {
  return renderWithProviders(<LPCContentContainer {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('LPCContentContainer', () => {
  let props: ComponentProps<typeof LPCContentContainer>

  beforeEach(() => {
    props = {
      header: 'MOCK_HEADER',
      ...mockLPCContentProps,
      children: <div>MOCK_CHILDREN</div>,
    }

    vi.mocked(ChildNavigation).mockReturnValue(<div>MOCK_CHILD_NAV</div>)
    vi.mocked(StepMeter).mockReturnValue(<div>MOCK_STEP_METER</div>)
    vi.mocked(useSelector).mockReturnValue({
      currentStepIndex: 1,
      totalStepCount: 5,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders correct content and children', () => {
    render(props)

    screen.getByText('MOCK_CHILDREN')
    screen.getByText('MOCK_CHILD_NAV')
    screen.getByText('MOCK_STEP_METER')
  })
})
