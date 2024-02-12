import 'jest-styled-components'
import * as React from 'react'
import {
  renderWithProviders,
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDERS,
} from '@opentrons/components'

import { TertiaryButton } from '..'

const render = (props: React.ComponentProps<typeof TertiaryButton>) => {
  return renderWithProviders(<TertiaryButton {...props} />)[0]
}

describe('TertiaryButton', () => {
  let props: React.ComponentProps<typeof TertiaryButton>

  beforeEach(() => {
    props = {
      children: 'tertiary button',
    }
  })
  it('renders tertiary button with text', () => {
    const { getByText } = render(props)
    const button = getByText('tertiary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.blue50}`)
    expect(button).toHaveStyle(
      `padding: ${SPACING.spacing8} ${SPACING.spacing16} ${SPACING.spacing8} ${SPACING.spacing16}`
    )
    expect(button).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSizeLabel}`)
    expect(button).toHaveStyle(`font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`)
    expect(button).toHaveStyle(`line-height: ${TYPOGRAPHY.lineHeight12}`)
    expect(button).toHaveStyle(`border-radius: ${BORDERS.radiusRoundEdge}`)
    expect(button).toHaveStyle(
      `text-transform: ${TYPOGRAPHY.textTransformNone}`
    )
    expect(button).toHaveStyle('box-shadow: none')
    expect(button).toHaveStyle('overflow: no-wrap')
    expect(button).toHaveStyle('white-space: nowrap')
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })

  it('renders tertiary button with text and disabled', () => {
    props.disabled = true
    const { getByText } = render(props)
    const button = getByText('tertiary button')
    expect(button).toBeDisabled()
    expect(button).toHaveStyle(`background-color: ${COLORS.grey30}`)
    expect(button).toHaveStyle(`color: ${COLORS.grey40}`)
  })

  it('applies the correct states to the button - hover', () => {
    const { getByText } = render(props)
    const button = getByText('tertiary button')
    expect(button).toHaveStyleRule('background-color', `${COLORS.blue55}`, {
      modifier: ':hover',
    })
    expect(button).toHaveStyleRule('box-shadow', 'none', {
      modifier: ':hover',
    })
  })

  it('applies the correct states to the button - active', () => {
    const { getByText } = render(props)
    const button = getByText('tertiary button')
    expect(button).toHaveStyleRule('background-color', `${COLORS.blue60}`, {
      modifier: ':active',
    })
  })

  it('applies the correct states to the button - focus-visible', () => {
    const { getByText } = render(props)
    const button = getByText('tertiary button')
    expect(button).toHaveStyleRule(
      'box-shadow',
      `0 0 0 3px ${COLORS.yellow50}`,
      {
        modifier: ':focus-visible',
      }
    )
  })

  it('renders tertiary button with text and different background color', () => {
    props.backgroundColor = COLORS.red50
    const { getByText } = render(props)
    const button = getByText('tertiary button')
    expect(button).toHaveStyle(`background-color: ${COLORS.red50}`)
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })
})
