import * as React from 'react'
import { fireEvent, renderHook } from '@testing-library/react'
import { renderWithProviders } from '@opentrons/components'
import { Numpad } from '..'

const render = (props: React.ComponentProps<typeof Numpad>) => {
  return renderWithProviders(<Numpad {...props} />)[0]
}

describe('Numpad', () => {
  it('should render the numpad keys', () => {
    const { result } = renderHook(() => React.useRef(null))
    const props = {
      onChange: jest.fn(),
      keyboardRef: result.current,
    }
    const { getAllByRole } = render(props)
    const buttons = getAllByRole('button')
    const expectedButtonNames = [
      '7',
      '8',
      '9',
      '4',
      '5',
      '6',
      '1',
      '2',
      '3',
      '0',
      '.',
      'del',
    ]

    buttons.forEach((button, index) => {
      const expectedName = expectedButtonNames[index]
      expect(button).toHaveTextContent(expectedName)
    })
  })

  it('should call mock function when clicking num key', () => {
    const { result } = renderHook(() => React.useRef(null))
    const props = {
      onChange: jest.fn(),
      keyboardRef: result.current,
    }
    const { getByRole } = render(props)
    const numKey = getByRole('button', { name: '1' })
    fireEvent.click(numKey)
    expect(props.onChange).toHaveBeenCalled()
  })
})
