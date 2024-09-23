import * as React from 'react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { fireEvent, screen } from '@testing-library/react'
import { FormAlerts } from '../FormAlerts'
import { i18n } from '../../../assets/localization'
import { renderWithProviders } from '../../../__testing-utils__'
import {
  getDynamicFieldFormErrorsForUnsavedForm,
  getFormLevelErrorsForUnsavedForm,
  getHydratedUnsavedForm,
} from '../../../step-forms/selectors'
import { getFormWarningsForSelectedStep } from '../../../dismiss/selectors'
import { getTimelineWarningsForSelectedStep } from '../../../top-selectors/timelineWarnings'
import { getSelectedStepId } from '../../../ui/steps'
import {
  dismissFormWarning,
  dismissTimelineWarning,
} from '../../../dismiss/actions'

vi.mock('../../../dismiss/actions')
vi.mock('../../../ui/steps')
vi.mock('../../../top-selectors/timelineWarnings')
vi.mock('../../../dismiss/selectors')
vi.mock('../../../step-forms/selectors')

const render = (props: React.ComponentProps<typeof FormAlerts>) => {
  return renderWithProviders(<FormAlerts {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('FormAlerts', () => {
  let props: React.ComponentProps<typeof FormAlerts>

  beforeEach(() => {
    props = {
      focusedField: null,
      dirtyFields: [],
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
    screen.getByText('Moving labware into waste chute')
    screen.getByText(
      'This labware has remaining liquid, be advised that once you dispose of it, there is no way to get it back later in the protocol.'
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
