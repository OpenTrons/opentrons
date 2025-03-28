import { describe, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '../../../testing/utils'
import { ListTable } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof ListTable>) => {
  return renderWithProviders(<ListTable {...props} />)[0]
}

describe('ListTable', () => {
  let props: ComponentProps<typeof ListTable>

  beforeEach(() => {
    props = {
      children: 'Table content',
    }
  })

  it('renders children correctly', () => {
    render(props)

    screen.getByText('Table content')
  })

  it('renders with single header correctly', () => {
    props = {
      children: 'Table content',
      headers: ['Header 1', undefined, undefined],
    }

    render(props)

    screen.getByText('Table content')
    screen.getByText('Header 1')
  })

  it('renders with multiple headers correctly', () => {
    props = {
      children: 'Table content',
      headers: ['Header 1', 'Header 2', 'Header 3'],
    }
    render(props)

    screen.getByText('Table content')
    screen.getByText('Header 1')
    screen.getByText('Header 2')
    screen.getByText('Header 3')
  })

  it('renders without headers correctly', () => {
    props = {
      children: 'Table content',
      headers: undefined,
    }

    render(props)

    screen.getByText('Table content')
  })

  it('renders multiple children correctly', () => {
    props = {
      children: (
        <>
          <div>First child</div>
          <div>Second child</div>
          <div>Third child</div>
        </>
      ),
    }

    render(props)

    screen.getByText('First child')
    screen.getByText('Second child')
    screen.getByText('Third child')
  })
})
