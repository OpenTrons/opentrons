import * as React from 'react'
import { renderWithProviders, COLORS, SPACING } from '@opentrons/components'

import { RadioButton } from '..'

const render = (props: React.ComponentProps<typeof RadioButton>) => {
  return renderWithProviders(<RadioButton {...props} />)[0]
}

describe('RadioButton', () => {
  let props: React.ComponentProps<typeof RadioButton>
  beforeEach(() => {
    props = {
      onChange: jest.fn(),
      buttonLabel: 'radio button',
      buttonValue: 1,
    }
  })
  it('renders the large button', () => {
    props = {
      ...props,
      radioButtonType: 'large',
    }
    const { getByRole } = render(props)
    const label = getByRole('label')
    expect(label).toHaveStyle(`background-color: ${COLORS.mediumBlueEnabled}`)
    expect(label).toHaveStyle(`padding: ${SPACING.spacing5}`)
  })
  it('renders the large selected button', () => {
    props = {
      ...props,
      isSelected: true,
      radioButtonType: 'large',
    }
    const { getByRole } = render(props)
    const label = getByRole('label')
    expect(label).toHaveStyle(`background-color: ${COLORS.blueEnabled}`)
    expect(label).toHaveStyle(`padding: ${SPACING.spacing5}`)
  })
  it('renders the small button', () => {
    props = {
      ...props,
      radioButtonType: 'small',
    }
    const { getByRole } = render(props)
    const label = getByRole('label')
    expect(label).toHaveStyle(`background-color: ${COLORS.mediumBlueEnabled}`)
    expect(label).toHaveStyle(`padding: ${SPACING.spacingM}`)
  })
  it('renders the small selected button', () => {
    props = {
      ...props,
      isSelected: true,
      radioButtonType: 'small',
    }
    const { getByRole } = render(props)
    const label = getByRole('label')
    expect(label).toHaveStyle(`background-color: ${COLORS.blueEnabled}`)
    expect(label).toHaveStyle(`padding: ${SPACING.spacingM}`)
  })
})
