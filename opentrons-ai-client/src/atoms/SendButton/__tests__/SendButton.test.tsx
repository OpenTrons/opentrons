import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../__testing-utils__'

import { SendButton } from '../index'

import type { ComponentProps } from 'react'

const mockHandleClick = vi.fn()
const render = (props: ComponentProps<typeof SendButton>) => {
  return renderWithProviders(<SendButton {...props} />)
}

describe('SendButton', () => {
  let props: ComponentProps<typeof SendButton>

  beforeEach(() => {
    props = {
      handleClick: mockHandleClick,
      disabled: true,
      isLoading: false,
    }
  })
  it('should render button with send icon and its initially disabled', () => {
    render(props)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    screen.getByTestId('SendButton_icon_send')
  })

  it('should render button and its not disabled when disabled false', () => {
    props = { ...props, disabled: false }
    render(props)
    const button = screen.getByRole('button')
    expect(button).not.toBeDisabled()
    screen.getByTestId('SendButton_icon_send')
  })

  it('should render button with spinner icon when isLoading', () => {
    props = { ...props, isLoading: true }
    render(props)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    screen.getByTestId('SendButton_icon_ot-spinner')
  })

  it('should call a mock function when clicking the button', () => {
    props = { ...props, disabled: false }
    render(props)
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(mockHandleClick).toHaveBeenCalled()
  })
})
