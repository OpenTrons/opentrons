import { describe, it, beforeEach, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '../../../../__testing-utils__'
import { i18n } from '../../../../assets/localization'
import { actions as tutorialActions } from '../../../../tutorial'
import { actions as featureFlagActions } from '../../../../feature-flags'
import { UserSettings } from '..'

import type { ComponentProps } from 'react'

vi.mock('../../../../tutorial')
vi.mock('../../../../feature-flags')

const render = (props: ComponentProps<typeof UserSettings>) => {
  return renderWithProviders(<UserSettings {...props} />, {
    i18nInstance: i18n,
  })
}

describe('UserSettings', () => {
  let props: ComponentProps<typeof UserSettings>
  beforeEach(() => {
    props = {
      canClearHintDismissals: true,
      flags: {
        OT_PD_ENABLE_HOT_KEYS_DISPLAY: true,
        OT_PD_ENABLE_MULTIPLE_TEMPS_OT2: true,
        OT_PD_DISABLE_MODULE_RESTRICTIONS: true,
      },
    }
  })
  it('renders the user settings section', () => {
    render(props)
    screen.getByText('User Settings')
    screen.getByText('Hints')
    screen.getByText('Reset')
    screen.getByText('Show all hints and tips notifications again')
    screen.getByText('Timeline editing guidance')
    screen.getByText(
      'Show information about working with steps next to the protocol timeline'
    )
    screen.getByText('Allow two temperature modules on OT-2')
    screen.getByText(
      'This experimental setting may cause collisions, and Opentrons will not be responsible for any damage resulting from its use.'
    )
    screen.getByText('Disable module placement restrictions')
    screen.getByText(
      'Turn off all restrictions on module placement and related pipette crash guidance.'
    )
    expect(screen.getAllByRole('switch').length).toBe(3)
  })

  it('should not reset button if canClearHintDismissals is false', () => {
    props = {
      ...props,
      canClearHintDismissals: false,
    }
    render(props)
    expect(screen.queryByText('Reset')).toBeNull()
    screen.getByText('No hints to restore')
  })

  it('should call mock function when clicking the reset button', () => {
    render(props)
    fireEvent.click(screen.getByText('Reset'))
    expect(vi.mocked(tutorialActions.clearAllHintDismissals)).toHaveBeenCalled()
  })

  it('should call mock function when clicking toggle switches', () => {
    render(props)
    const toggleButtons = screen.getAllByRole('switch')

    fireEvent.click(toggleButtons[0])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ENABLE_HOT_KEYS_DISPLAY: false,
    })

    fireEvent.click(toggleButtons[1])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ENABLE_MULTIPLE_TEMPS_OT2: false,
    })

    fireEvent.click(toggleButtons[2])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_DISABLE_MODULE_RESTRICTIONS: false,
    })
  })
})
