import 'jest-styled-components'
import * as React from 'react'
import {
  renderWithProviders,
  BORDERS,
  LEGACY_COLORS,
  SPACING,
  TYPOGRAPHY,
} from '@opentrons/components'

import { FloatingActionButton } from '..'
import { i18n } from '../../../i18n'

const render = (props: React.ComponentProps<typeof FloatingActionButton>) => {
  return renderWithProviders(<FloatingActionButton {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('FloatingActionButton', () => {
  let props: React.ComponentProps<typeof FloatingActionButton>

  beforeEach(() => {
    props = {
      buttonText: 'floating action',
      onClick: jest.fn(),
    }
  })

  it('renders floating action button with text', () => {
    const { getByRole } = render(props)
    const button = getByRole('button')
    expect(button).toHaveStyle(
      `padding: ${SPACING.spacing12} ${SPACING.spacing24}`
    )
    expect(button).toHaveStyle(
      `background-color: ${LEGACY_COLORS.highlightPurple1}`
    )
    expect(button).toHaveStyle(`font-size: ${TYPOGRAPHY.fontSize28}`)
    expect(button).toHaveStyle(`font-weight: ${TYPOGRAPHY.fontWeightSemiBold}`)
    expect(button).toHaveStyle(`line-height: ${TYPOGRAPHY.lineHeight36}`)
    expect(button).toHaveStyle(`border-radius: ${BORDERS.borderRadiusSize5}`)
    expect(button).toHaveStyle(
      `text-transform: ${TYPOGRAPHY.textTransformNone}`
    )
    expect(button).toHaveStyle(`box-shadow: ${BORDERS.shadowBig}`)
    expect(button).toHaveStyle(`color: ${COLORS.white}`)
  })

  it('renders unselected floating action button with text and disabled', () => {
    props.disabled = true
    const { getByRole } = render(props)
    const button = getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveStyle(`background-color: #16212d33`)
    expect(button).toHaveStyle(`color: #16212d99`)
  })

  it('applies the correct states to the unselected floating action button - active', () => {
    const { getByRole } = render(props)
    const button = getByRole('button')
    expect(button).toHaveStyleRule(
      'background-color',
      `${COLORS.purple55}`,
      {
        modifier: ':active',
      }
    )
  })

  it('applies the correct states to the unselected floating action button - focus-visible', () => {
    const { getByRole } = render(props)
    const button = getByRole('button')
    expect(button).toHaveStyleRule('border-color', `${COLORS.blue50}`, {
      modifier: ':focus-visible',
    })
  })
})
