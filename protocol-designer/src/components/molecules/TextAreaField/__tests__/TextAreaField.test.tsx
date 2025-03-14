import { describe, it, beforeEach, vi, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

import { renderWithProviders } from '../../../../__testing-utils__'
import { TextAreaField } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof TextAreaField>) => {
  return renderWithProviders(<TextAreaField {...props} />)
}

describe('TextAreaField', () => {
  let props: ComponentProps<typeof TextAreaField>

  beforeEach(() => {
    props = {
      title: 'TextAreaField',
      placeholder: 'Enter text...',
      value: '',
      onChange: vi.fn(),
    }
  })

  it('renders the TextAreaField component', () => {
    render(props)
    screen.getByText('TextAreaField')
    expect(screen.getByTestId('TextAreaField')).toBeInTheDocument()
  })

  it('displays the correct placeholder text', () => {
    render(props)
    expect(screen.getByPlaceholderText('Enter text...')).toBeInTheDocument()
  })

  it('updates value when user types', () => {
    render(props)
    const textarea = screen.getByTestId('TextAreaField')

    fireEvent.change(textarea, { target: { value: 'Hello, world!' } })

    expect(props.onChange).toHaveBeenCalledTimes(1)
  })

  it('disables the textarea when disabled prop is true', () => {
    props.disabled = true
    render(props)
    expect(screen.getByTestId('TextAreaField')).toBeDisabled()
  })

  it('displays an error message when error prop is provided', () => {
    props.error = 'Error: Invalid input'
    render(props)

    expect(screen.getByText('Error: Invalid input')).toBeInTheDocument()
  })

  it('display an icon when tooltip prop is provided', () => {
    props.tooltipText = 'ot-icon-check'
    render(props)
    screen.getByTestId('tooltip-icon')
  })

  it('display left icon when leftIcon prop is provided', () => {
    props.leftIcon = 'information'
    render(props)
    screen.getByTestId('left-icon')
  })
})
