import { describe, it, beforeEach, expect, vi } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'

import { renderWithProviders } from '../../../../__testing-utils__'
import { i18n } from '../../../../assets/localization'
import { actions as analyticsActions } from '../../../../analytics'

import { Privacy } from '..'

import type { ComponentProps } from 'react'

vi.mock('../../../../analytics')

const render = (props: ComponentProps<typeof Privacy>) => {
  return renderWithProviders(<Privacy {...props} />, {
    i18nInstance: i18n,
  })
}

describe('UserSettings', () => {
  let props: ComponentProps<typeof Privacy>
  beforeEach(() => {
    props = {
      hasOptedIn: true,
    }
  })
  it('renders the privacy section', () => {
    render(props)
    screen.getByText('Privacy')
    screen.getByText('Share analytics with Opentrons')
    screen.getByText(
      'Help Opentrons improve its products and services by automatically sending anonymous diagnostics and usage data.'
    )
    screen.getByRole('switch')
  })

  it('should call optOut when clicking toggle switch when opted in', () => {
    render(props)
    fireEvent.click(screen.getByRole('switch'))
    expect(vi.mocked(analyticsActions.optOut)).toHaveBeenCalled()
  })

  it('should call optIn when clicking toggle switch when not opted in', () => {
    props.hasOptedIn = false
    render(props)
    fireEvent.click(screen.getByRole('switch'))
    expect(vi.mocked(analyticsActions.optIn)).toHaveBeenCalled()
  })
})
