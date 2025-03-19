import { describe, it, beforeEach, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '../../../../__testing-utils__'
import { i18n } from '../../../../assets/localization'
import { actions as featureFlagActions } from '../../../../feature-flags'
import { FeatureFlag } from '..'

import type { ComponentProps } from 'react'

vi.mock('../../../../feature-flags')

const render = (props: ComponentProps<typeof FeatureFlag>) => {
  return renderWithProviders(<FeatureFlag {...props} />, {
    i18nInstance: i18n,
  })
}

describe('FeatureFlag', () => {
  let props: ComponentProps<typeof FeatureFlag>
  beforeEach(() => {
    props = {
      flags: {
        PRERELEASE_MODE: true,
        OT_PD_ALLOW_ALL_TIPRACKS: true,
        OT_PD_ENABLE_COMMENT: true,
        OT_PD_ENABLE_RETURN_TIP: true,
        OT_PD_ENABLE_REACT_SCAN: true,
        OT_PD_ENABLE_LIQUID_CLASSES: true,
        OT_PD_ENABLE_TIMELINE_SCRUBBER: true,
        OT_PD_ENABLE_PYTHON_EXPORT: true,
      },
    }
  })

  it('renders the feature flags section', () => {
    render(props)
    screen.getByText('Developer Feature Flags')
    screen.getByText('Use prerelease mode')
    screen.getByText('Show in-progress features for testing & internal use')
    screen.getByText('Allow all tip rack options')
    screen.getByText('Enable selection of all tip racks for each pipette.')
    screen.getByText('Enable comment step')
    screen.getByText('You can add comments anywhere between timeline steps.')
    screen.getByText('Enable return tip')
    screen.getByText(
      'You can choose which tip to pick up and where to drop tip.'
    )
    screen.getByText('Enable React Scan')
    screen.getByText('Enable React Scan support for components rendering check')
    screen.getByText('Enable liquid classes')
    screen.getByText('Enable liquid classes support')
    screen.getByText('Enable timeline scrubber')
    screen.getByText('See the protocol timeline visualization in overview')
    screen.getByText('Enable exporting python')
    screen.getByText(
      'Enables the ability to export python for pd/python interop'
    )
    expect(screen.getAllByRole('switch').length).toBe(8)
  })
  it('should call function when clicking toggle switches', () => {
    render(props)
    const toggleButtons = screen.getAllByRole('switch')

    fireEvent.click(toggleButtons[0])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      PRERELEASE_MODE: false,
    })

    fireEvent.click(toggleButtons[1])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ALLOW_ALL_TIPRACKS: false,
    })

    fireEvent.click(toggleButtons[2])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ENABLE_COMMENT: false,
    })

    fireEvent.click(toggleButtons[3])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ENABLE_RETURN_TIP: false,
    })

    fireEvent.click(toggleButtons[4])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ENABLE_REACT_SCAN: false,
    })

    fireEvent.click(toggleButtons[5])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ENABLE_LIQUID_CLASSES: false,
    })

    fireEvent.click(toggleButtons[6])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ENABLE_TIMELINE_SCRUBBER: false,
    })

    fireEvent.click(toggleButtons[7])
    expect(vi.mocked(featureFlagActions.setFeatureFlags)).toHaveBeenCalledWith({
      OT_PD_ENABLE_PYTHON_EXPORT: false,
    })
  })
})
