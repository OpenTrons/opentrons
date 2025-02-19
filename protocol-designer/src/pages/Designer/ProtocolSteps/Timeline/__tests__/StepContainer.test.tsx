import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { i18n } from '/protocol-designer/assets/localization'
import { getUnsavedForm } from '/protocol-designer/step-forms/selectors'
import { StepContainer } from '../StepContainer'
import { StepOverflowMenu } from '../StepOverflowMenu'

import type { ComponentProps } from 'react'

vi.mock('/protocol-designer/step-forms/selectors')
vi.mock('/protocol-designer/ui/steps/actions/actions')
vi.mock('/protocol-designer/ui/steps/selectors')
vi.mock('../StepOverflowMenu')

const render = (props: ComponentProps<typeof StepContainer>) => {
  return renderWithProviders(<StepContainer {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('StepContainer', () => {
  let props: ComponentProps<typeof StepContainer>

  beforeEach(() => {
    props = {
      title: 'Starting deck state',
      iconName: 'add',
      onClick: vi.fn(),
      selected: false,
      hovered: false,
      stepId: 'mockStepId',
      hasError: false,
      isStepAfterError: false,
      sidebarWidth: 350,
    }
    vi.mocked(StepOverflowMenu).mockReturnValue(
      <div>mock StepOverflowMenu</div>
    )
    vi.mocked(getUnsavedForm).mockReturnValue(null)
  })

  it('renders the starting deck state step', () => {
    render(props)
    fireEvent.click(screen.getByText('Starting deck state'))
    expect(props.onClick).toHaveBeenCalled()
  })
  it('renders the ending deck state step', () => {
    props.title = 'Final deck state'
    render(props)
    screen.getByText('Final deck state')
  })
  it('renders the divider if hover targets that step', () => {
    render({ ...props, dragHovered: true })
    screen.getByTestId('divider')
  })
})
