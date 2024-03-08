import * as React from 'react'
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { COLORS, BORDERS } from '@opentrons/components'
import { renderWithProviders } from '../../../__testing-utils__'

import { MediumButton } from '../MediumButton'

const render = (props: React.ComponentProps<typeof MediumButton>) => {
  return renderWithProviders(<MediumButton {...props} />)[0]
}

describe('MediumButton', () => {
  let props: React.ComponentProps<typeof MediumButton>
  beforeEach(() => {
    props = {
      onClick: vi.fn(),
      buttonType: 'primary',
      buttonText: 'Medium button',
    }
  })
  it('renders the default button and it works as expected', () => {
    render(props)
    fireEvent.click(screen.getByText('Medium button'))
    expect(props.onClick).toHaveBeenCalled()
    expect(screen.getByRole('button')).toHaveStyle('background-color: #045dd0')
  })
  it('renders the alert button', () => {
    props = {
      ...props,
      buttonType: 'alert',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle('background-color: #b91f20')
  })
  it('renders the secondary button', () => {
    props = {
      ...props,
      buttonType: 'secondary',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle('background-color: #94afd4')
  })
  it('renders the secondary alert button', () => {
    props = {
      ...props,
      buttonType: 'alertSecondary',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle('background-color: #ccabac')
  })
  it('renders the tertiary high button', () => {
    props = {
      ...props,
      buttonType: 'tertiaryHigh',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.grey35}`
    )
  })
  it('renders the tertiary low light button', () => {
    props = {
      ...props,
      buttonType: 'tertiaryLowLight',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `background-color: ${COLORS.grey35}`
    )
  })
  it('renders the button as disabled', () => {
    props = {
      ...props,
      disabled: true,
    }
    render(props)
    expect(screen.getByRole('button')).toBeDisabled()
  })
  it('renders custom icon in the button', () => {
    props = {
      ...props,
      iconName: 'restart',
    }
    render(props)
    screen.getByLabelText('restart icon')
  })
  it('renders the rounded button category', () => {
    props = {
      ...props,
      buttonCategory: 'rounded',
    }
    render(props)
    expect(screen.getByRole('button')).toHaveStyle(
      `border-radius: ${BORDERS.borderRadiusSize5}`
    )
  })
})
