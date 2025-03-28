import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'

import { renderWithProviders } from '../../../testing/utils'
import { ListAccordion } from '..'
import { ListTable } from '../../../atoms/ListTable'
import { Icon } from '../../../icons'

import type { ComponentProps } from 'react'

vi.mock('../../../atoms/ListTable')

const render = (props: ComponentProps<typeof ListAccordion>) => {
  return renderWithProviders(<ListAccordion {...props} />)[0]
}

describe('ListAccordion', () => {
  let props: ComponentProps<typeof ListAccordion>

  beforeEach(() => {
    props = {
      headerChild: <div>Header Content</div>,
      alertKind: 'default',
      tableHeaders: ['Header 1', 'Header 2', 'Header 3'],
      children: <div>Accordion Content</div>,
    }
  })

  it('renders the headerChild correctly', () => {
    render(props)

    screen.getByText('Header Content')
  })

  it('renders with ListTable component', () => {
    render(props)

    expect(ListTable).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: props.tableHeaders,
        children: props.children,
      }),
      expect.anything()
    )
  })

  it('renders with default alertKind and no icon', () => {
    render(props)

    expect(screen.queryByTestId('alert-circle')).not.toBeInTheDocument()
  })

  it('renders with warning alertKind and shows alert icon', () => {
    props.alertKind = 'warning'

    render(props)

    expect(screen.getByTestId('alert-circle')).toBeInTheDocument()
  })

  it('renders custom icon when provided and alertKind is default', () => {
    const customIcon = <Icon name="info" data-testid="icon-info" />
    props.icon = customIcon

    render(props)

    expect(screen.getByTestId('icon-info')).toBeInTheDocument()
  })

  it('prioritizes alert icon over custom icon when alertKind is warning', () => {
    const customIcon = <Icon name="info" data-testid="icon-info" />
    props.alertKind = 'warning'
    props.icon = customIcon

    render(props)

    expect(screen.getByTestId('alert-circle')).toBeInTheDocument()
    expect(screen.queryByTestId('icon-info')).not.toBeInTheDocument()
  })

  it('toggles open with proper icon state when header is clicked', () => {
    render(props)

    expect(screen.getByTestId('chevron-down')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Header Content'))

    expect(screen.queryByTestId('chevron-down')).not.toBeInTheDocument()
    expect(screen.getByTestId('chevron-up')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Header Content'))

    expect(screen.getByTestId('chevron-down')).toBeInTheDocument()
    expect(screen.queryByTestId('chevron-up')).not.toBeInTheDocument()
  })

  it('passes correct headers to ListTable', () => {
    props.tableHeaders = ['Custom Header 1', 'Custom Header 2']

    render(props)

    expect(ListTable).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: ['Custom Header 1', 'Custom Header 2'],
      }),
      expect.anything()
    )
  })

  it('passes children to ListTable correctly', () => {
    const testChildren = <div>Test Children Content</div>
    props.children = testChildren

    render(props)

    expect(ListTable).toHaveBeenCalledWith(
      expect.objectContaining({
        children: testChildren,
      }),
      expect.anything()
    )
  })
})
