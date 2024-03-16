import * as React from 'react'
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { BORDERS, COLORS } from '@opentrons/components'
import { renderWithProviders } from '../../../__testing-utils__'
import { Chip } from '..'

const render = (props: React.ComponentProps<typeof Chip>) => {
  return renderWithProviders(<Chip {...props} />)
}

describe('Chip', () => {
  let props: React.ComponentProps<typeof Chip>

  it('should render text, no icon with basic colors', () => {
    props = {
      text: 'mockBasic',
      type: 'basic',
    }
    render(props)
    const chip = screen.getByTestId('Chip_basic')
    const chipText = screen.getByText('mockBasic')
    expect(chip).toHaveStyle(
      `background-color: ${COLORS.black90}${COLORS.opacity20HexCode}`
    )
    expect(chipText).toHaveStyle(`color: ${COLORS.grey60}`)
    expect(screen.queryByLabelText('icon_mockBasic')).not.toBeInTheDocument()
  })

  it('should render text, icon, bgcolor with success colors', () => {
    props = {
      text: 'mockSuccess',
      type: 'success',
    }
    render(props)
    const chip = screen.getByTestId('Chip_success')
    const chipText = screen.getByText('mockSuccess')
    expect(chip).toHaveStyle(`background-color: ${COLORS.green35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.green60}`)
    const icon = screen.getByLabelText('icon_mockSuccess')
    expect(icon).toHaveStyle(`color: ${COLORS.green60}`)
  })

  it('should render text, icon, no bgcolor with success colors and bg false', () => {
    props = {
      background: false,
      text: 'mockSuccess',
      type: 'success',
    }
    render(props)
    const chip = screen.getByTestId('Chip_success')
    const chipText = screen.getByText('mockSuccess')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.green60}`)
    const icon = screen.getByLabelText('icon_mockSuccess')
    expect(icon).toHaveStyle(`color: ${COLORS.green60}`)
  })

  it('should render text, icon, bgcolor with warning colors', () => {
    props = {
      text: 'mockWarning',
      type: 'warning',
    }
    render(props)
    const chip = screen.getByTestId('Chip_warning')
    const chipText = screen.getByText('mockWarning')
    expect(chip).toHaveStyle(`background-color: ${COLORS.yellow35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.yellow60}`)
    const icon = screen.getByLabelText('icon_mockWarning')
    expect(icon).toHaveStyle(`color: ${COLORS.yellow60}`)
  })

  it('should render text, icon, no bgcolor with warning colors and bg false', () => {
    props = {
      background: false,
      text: 'mockWarning',
      type: 'warning',
    }
    render(props)
    const chip = screen.getByTestId('Chip_warning')
    const chipText = screen.getByText('mockWarning')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.yellow60}`)
    const icon = screen.getByLabelText('icon_mockWarning')
    expect(icon).toHaveStyle(`color: ${COLORS.yellow60}`)
  })

  it('should render text, icon, bgcolor with neutral colors', () => {
    props = {
      text: 'mockNeutral',
      type: 'neutral',
    }
    render(props)
    const chip = screen.getByTestId('Chip_neutral')
    const chipText = screen.getByText('mockNeutral')
    expect(chip).toHaveStyle(
      `background-color: ${COLORS.black90}${COLORS.opacity20HexCode}`
    )
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.grey60}`)
    const icon = screen.getByLabelText('icon_mockNeutral')
    expect(icon).toHaveStyle(`color: ${COLORS.grey60}`)
  })

  it('should render text, icon, no bgcolor with neutral colors and bg false', () => {
    props = {
      background: false,
      text: 'mockNeutral',
      type: 'neutral',
    }
    render(props)
    const chip = screen.getByTestId('Chip_neutral')
    const chipText = screen.getByText('mockNeutral')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.grey60}`)
    const icon = screen.getByLabelText('icon_mockNeutral')
    expect(icon).toHaveStyle(`color: ${COLORS.grey60}`)
  })

  it('should render text, icon, bgcolor with error colors', () => {
    props = {
      text: 'mockError',
      type: 'error',
    }
    render(props)
    const chip = screen.getByTestId('Chip_error')
    const chipText = screen.getByText('mockError')
    expect(chip).toHaveStyle(`background-color: ${COLORS.red35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.red60}`)
    const icon = screen.getByLabelText('icon_mockError')
    expect(icon).toHaveStyle(`color: ${COLORS.red60}`)
  })

  it('should render text, icon, no bgcolor with error colors and bg false', () => {
    props = {
      background: false,
      text: 'mockError',
      type: 'error',
    }
    render(props)
    const chip = screen.getByTestId('Chip_error')
    const chipText = screen.getByText('mockError')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.red60}`)
    const icon = screen.getByLabelText('icon_mockError')
    expect(icon).toHaveStyle(`color: ${COLORS.red60}`)
  })

  it('should render text, icon, bgcolor with info colors', () => {
    props = {
      text: 'mockInfo',
      type: 'info',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    const chipText = screen.getByText('mockInfo')
    expect(chip).toHaveStyle(`background-color: ${COLORS.blue35}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.blue60}`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`color: ${COLORS.blue60}`)
  })

  it('should render text, icon, no bgcolor with info colors and bg false', () => {
    props = {
      background: false,
      text: 'mockInfo',
      type: 'info',
    }
    render(props)
    const chip = screen.getByTestId('Chip_info')
    const chipText = screen.getByText('mockInfo')
    expect(chip).toHaveStyle(`background-color: ${COLORS.transparent}`)
    expect(chip).toHaveStyle(`border-radius: ${BORDERS.borderRadius40}`)
    expect(chipText).toHaveStyle(`color: ${COLORS.blue60}`)
    const icon = screen.getByLabelText('icon_mockInfo')
    expect(icon).toHaveStyle(`color: ${COLORS.blue60}`)
  })
})
