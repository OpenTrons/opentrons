import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../../assets/localization'
import { renderWithProviders } from '../../../../__testing-utils__'
import { getRobotStateTimeline } from '../../../../file-data/selectors'
import { selectDesignerTab } from '../../../../file-data/actions'
import { TimelineAlerts } from '../TimelineAlerts'

vi.mock('../../../../file-data/selectors')
vi.mock('../../../../file-data/actions')

const render = () => {
  return renderWithProviders(<TimelineAlerts />, {
    i18nInstance: i18n,
  })[0]
}

describe('TimelineAlerts', () => {
  beforeEach(() => {
    vi.mocked(getRobotStateTimeline).mockReturnValue({
      timeline: {} as any,
      errors: [{ message: 'mockMessage', type: 'INSUFFICIENT_TIPS' }],
    })
  })

  it('renders the insufficient tips timeline error and clicking on the button turns it into the starting deck state terminal id ', () => {
    render()
    screen.getByText('Not enough tips to complete action')
    screen.getByText(
      'Add another tip rack to your deck or change your tip management during transfer and mix steps.'
    )
    fireEvent.click(screen.getByText('Edit starting deck'))
    expect(vi.mocked(selectDesignerTab)).toHaveBeenCalled()
  })
  it('renders the no tip on pipette timeline error and the knowledge link', () => {
    vi.mocked(getRobotStateTimeline).mockReturnValue({
      timeline: {} as any,
      errors: [{ message: 'mockMessage', type: 'NO_TIP_ON_PIPETTE' }],
    })
    render()
    screen.getByText('No tip on pipette at start of step')
  })
})
