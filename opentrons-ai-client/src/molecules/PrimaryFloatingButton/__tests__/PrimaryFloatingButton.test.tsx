import { describe, it, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { BORDERS, COLORS, TYPOGRAPHY, SPACING } from '@opentrons/components'
import { renderWithProviders } from '../../../__testing-utils__'
import { PrimaryFloatingButton } from '../index'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof PrimaryFloatingButton>) => {
  return renderWithProviders(<PrimaryFloatingButton {...props} />)
}

describe('PrimaryFloatingButton', () => {
  let props: ComponentProps<typeof PrimaryFloatingButton>
  beforeEach(() => {
    props = {
      buttonText: 'primary floating button',
      iconName: 'arrow-down',
      disabled: false,
    }
  })
  it('render primary floating button', () => {
    render(props)
    const button = screen.getByRole('button', {
      name: 'primary floating button',
    })
    expect(button).toHaveStyle(`background-color: ${COLORS.blue50}`)
    expect(button).toHaveStyle(
      `padding: ${SPACING.spacing8} ${SPACING.spacing16}`
    )
    const buttonText = screen.getByText('primary floating button')
    expect(buttonText).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeP}`)
    expect(buttonText).toHaveStyle(
      `font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`
    )
    expect(buttonText).toHaveStyle(`line-height: ${TYPOGRAPHY.lineHeight20}`)
    expect(button).toHaveStyle(`border-radius: ${BORDERS.borderRadiusFull}`)
    expect(button).toHaveStyle(
      `text-transform: ${TYPOGRAPHY.textTransformNone}`
    )
    expect(button).toHaveStyle(`box-shadow: none`)
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })

  it('should render icon', () => {
    render(props)
    const icon = screen.getByTestId('PrimaryFloatingButton_Icon')
    expect(icon).toHaveStyle(`width: 0.75rem`)
    expect(icon).toHaveStyle(`height: 0.75rem`)
    expect(icon).toHaveStyle(`color: ${COLORS.white}`)
  })

  it('renders primary button with text and disabled', () => {
    props.disabled = true
    render(props)
    const button = screen.getByRole('button', {
      name: 'primary floating button',
    })
    expect(button).toBeDisabled()
    expect(button).toHaveStyle(`background-color: ${COLORS.grey30}`)
    expect(button).toHaveStyle(`color: ${COLORS.grey40}`)
  })

  it('applies the correct states to the button - hover', () => {
    render(props)
    const button = screen.getByRole('button', {
      name: 'primary floating button',
    })
    fireEvent.mouseOver(button)
    expect(button).toHaveStyle(`background-color: ${COLORS.blue50}`)
  })
})
