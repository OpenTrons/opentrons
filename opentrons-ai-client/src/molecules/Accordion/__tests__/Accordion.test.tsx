import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { renderWithProviders } from '../../../__testing-utils__'

import { Accordion } from '../index'

import type { ComponentProps } from 'react'

const mockHandleClick = vi.fn()
const render = (props: ComponentProps<typeof Accordion>) => {
  return renderWithProviders(<Accordion {...props} />)
}

describe('Accordion', () => {
  let props: ComponentProps<typeof Accordion>

  beforeEach(() => {
    props = {
      id: 'accordion-test',
      handleClick: mockHandleClick,
      isOpen: false,
      isCompleted: false,
      heading: 'Accordion heading',
      children: <div>Accordion content</div>,
    }
  })

  it('should render an accordion with heading', () => {
    render(props)
    const accordion = screen.getByRole('button', { name: 'Accordion heading' })
    expect(accordion).toBeInTheDocument()
  })

  it('should display content if isOpen is true', () => {
    props.isOpen = true
    render(props)
    const accordionContent = screen.getByText('Accordion content')
    expect(accordionContent).toBeVisible()
  })

  it('should not display content if isOpen is false', () => {
    render(props)
    const accordionContent = screen.queryByText('Accordion content')
    expect(accordionContent).not.toBeVisible()
  })

  it("should call handleClick when the accordion's header is clicked", () => {
    render(props)
    const accordionHeader = screen.getByRole('button', {
      name: 'Accordion heading',
    })
    fireEvent.click(accordionHeader)
    expect(mockHandleClick).toHaveBeenCalled()
  })

  it('should display a check icon if isCompleted is true', () => {
    props.isCompleted = true
    render(props)
    const checkIcon = screen.getByTestId('accordion-test-ot-check')
    expect(checkIcon).toBeInTheDocument()
  })

  it('should not display a check icon if isCompleted is false', () => {
    props.isCompleted = false
    render(props)
    const checkIcon = screen.queryByTestId('accordion-test-ot-check')
    expect(checkIcon).not.toBeInTheDocument()
  })
})
