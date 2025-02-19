import { describe, it, vi, beforeEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, screen } from '@testing-library/react'

import { AnnouncementModal } from '/protocol-designer/organisms'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { getHasOptedIn } from '/protocol-designer/analytics/selectors'
import { getFeatureFlagData } from '/protocol-designer/feature-flags/selectors'
import { getCanClearHintDismissals } from '/protocol-designer/tutorial/selectors'
import { clearAllHintDismissals } from '/protocol-designer/tutorial/actions'
import { optIn } from '/protocol-designer/analytics/actions'
import { setFeatureFlags } from '/protocol-designer/feature-flags/actions'

import { Settings } from '..'

vi.mock('/protocol-designer/organisms')
vi.mock('/protocol-designer/feature-flags/actions')
vi.mock('/protocol-designer/analytics/actions')
vi.mock('/protocol-designer/tutorial/actions')
vi.mock('/protocol-designer/tutorial/selectors')
vi.mock('/protocol-designer/feature-flags/selectors')
vi.mock('/protocol-designer/analytics/selectors')
const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('Settings', () => {
  beforeEach(() => {
    vi.mocked(getHasOptedIn).mockReturnValue({
      hasOptedIn: false,
      appVersion: '8.2.1',
    })
    vi.mocked(getFeatureFlagData).mockReturnValue({})
    vi.mocked(getCanClearHintDismissals).mockReturnValue(true)
  })
  it('renders the settings page without the dev ffs visible', () => {
    render()
    screen.getByText('Settings')
    screen.getByText('App Info')
    screen.getByText('Protocol designer version')
    screen.getByText('fake_PD_version')
    screen.getAllByText('Release notes')
    screen.getByText('User Settings')
    screen.getByText('Hints')
    screen.getByText('Show all hints and tips notifications again')
    screen.getByText('Timeline editing guidance')
    screen.getByText(
      'Show information about working with steps next to the protocol timeline'
    )
    screen.getByText('Reset')
    screen.getByText('Privacy')
    screen.getByText('Share analytics with Opentrons')
    screen.debug()
  })
  it('renders the announcement modal when view release notes button is clicked', () => {
    vi.mocked(AnnouncementModal).mockReturnValue(
      <div>mock AnnouncementModal</div>
    )
    render()
    fireEvent.click(
      screen.getByTestId('AnnouncementModal_viewReleaseNotesButton')
    )
    screen.getByText('mock AnnouncementModal')
  })
  it('renders the hints button and calls to dismiss them when text is pressed', () => {
    render()
    fireEvent.click(screen.getByText('Reset'))
    expect(vi.mocked(clearAllHintDismissals)).toHaveBeenCalled()
  })
  it('renders the analytics toggle and calls the action when pressed', () => {
    render()
    fireEvent.click(screen.getByTestId('analyticsToggle'))
    expect(vi.mocked(optIn)).toHaveBeenCalled()
  })
  it('renders the dev ffs section when prerelease mode is turned on', () => {
    vi.mocked(getFeatureFlagData).mockReturnValue({
      PRERELEASE_MODE: true,
      OT_PD_DISABLE_MODULE_RESTRICTIONS: true,
    })

    render()
    screen.getByText('Developer Feature Flags')
    screen.getByText('Use prerelease mode')
    screen.getByText('Show in-progress features for testing & internal use')
    screen.getByText('Disable module placement restrictions')
    screen.getByText(
      'Turn off all restrictions on module placement and related pipette crash guidance.'
    )
    fireEvent.click(screen.getByLabelText('Settings_PRERELEASE_MODE'))
    expect(vi.mocked(setFeatureFlags)).toHaveBeenCalled()
  })
})
