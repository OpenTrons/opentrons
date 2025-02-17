import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { FormAlerts } from '../FormAlerts'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import {
  getDynamicFieldFormErrorsForUnsavedForm,
  getFormLevelErrorsForUnsavedForm,
  getHydratedUnsavedForm,
} from '/protocol-designer/step-forms/selectors'
import { getFormWarningsForSelectedStep } from '/protocol-designer/dismiss/selectors'
import { getTimelineWarningsForSelectedStep } from '/protocol-designer/top-selectors/timelineWarnings'
import { getSelectedStepId } from '/protocol-designer/ui/steps'
import {
  dismissFormWarning,
  dismissTimelineWarning,
} from '/protocol-designer/dismiss/actions'

import type { ComponentProps } from 'react'

vi.mock('/protocol-designer/dismiss/actions')
vi.mock('/protocol-designer/ui/steps')
vi.mock('/protocol-designer/top-selectors/timelineWarnings')
vi.mock('/protocol-designer/dismiss/selectors')
vi.mock('/protocol-designer/step-forms/selectors')

const render = (props: ComponentProps<typeof FormAlerts>) => {
  return renderWithProviders(<FormAlerts {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('FormAlerts', () => {
  let props: ComponentProps<typeof FormAlerts>

  beforeEach(() => {
    props = {
      focusedField: null,
      dirtyFields: [],
      showFormErrors: false,
      page: 0,
    }
    vi.mocked(getFormLevelErrorsForUnsavedForm).mockReturnValue([])
    vi.mocked(getFormWarningsForSelectedStep).mockReturnValue([])
    vi.mocked(getTimelineWarningsForSelectedStep).mockReturnValue([])
    vi.mocked(getHydratedUnsavedForm).mockReturnValue(null)
    vi.mocked(getDynamicFieldFormErrorsForUnsavedForm).mockReturnValue([])
    vi.mocked(getSelectedStepId).mockReturnValue('123')
  })

  it('renders a timeline warning that is dismissible', () => {
    vi.mocked(getTimelineWarningsForSelectedStep).mockReturnValue([
      {
        message: 'mock message',
        type: 'LABWARE_IN_WASTE_CHUTE_HAS_LIQUID',
      },
    ])
    render(props)
    screen.getByText('Disposing liquid-filled labware')
    screen.getByText(
      'This step moves a labware that contains liquid to the waste chute. There is no way to retrieve the liquid after disposal.'
    )
    fireEvent.click(screen.getByTestId('Banner_close-button'))
    expect(vi.mocked(dismissTimelineWarning)).toHaveBeenCalled()
  })
  it('renders a form level warning that is dismissible', () => {
    vi.mocked(getFormWarningsForSelectedStep).mockReturnValue([
      {
        type: 'TIP_POSITIONED_LOW_IN_TUBE',
        title: 'mockTitle',
        dependentFields: [],
      },
    ])
    render(props)
    screen.getByText('mockTitle')
    fireEvent.click(screen.getByTestId('Banner_close-button'))
    expect(vi.mocked(dismissFormWarning)).toHaveBeenCalled()
  })
})
