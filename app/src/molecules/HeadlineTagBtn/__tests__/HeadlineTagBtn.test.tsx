import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { HeadlineTagBtn } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof HeadlineTagBtn>) => {
  return renderWithProviders(<HeadlineTagBtn {...props} />)[0]
}

describe('HeadlineTagBtn', () => {
  let props: ComponentProps<typeof HeadlineTagBtn>
  const onClickOnDevice = vi.fn()
  const onClickDesktop = vi.fn()
  const mockTag = <div data-testid="mock-tag">Tag</div>

  beforeEach(() => {
    onClickOnDevice.mockReset()
    onClickDesktop.mockReset()

    props = {
      headline: 'Test Headline',
      buttonText: 'Test Button',
      onClick: onClickDesktop,
      tag: mockTag,
    }
  })

  it('renders the headline text correctly', () => {
    render(props)

    screen.getByText('Test Headline')
  })

  it('renders the tag when provided', () => {
    render(props)

    screen.getByTestId('mock-tag')
  })

  it('renders button and provides onClick functionality', () => {
    render(props)

    const button = screen.getAllByRole('button', { name: 'Test Button' })[0]

    fireEvent.click(button)

    expect(onClickDesktop).toHaveBeenCalledTimes(1)
    expect(onClickOnDevice).not.toHaveBeenCalled()
  })
})
