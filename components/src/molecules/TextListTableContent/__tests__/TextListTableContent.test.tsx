import { describe, it, beforeEach, vi } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '../../../testing/utils'
import { TextListTableContent } from '..'
import { ListTable } from '../../../atoms/ListTable'

import type { ComponentProps } from 'react'

vi.mock('../../../atoms/ListTable')

const render = (props: ComponentProps<typeof TextListTableContent>) => {
  return renderWithProviders(
    <TextListTableContent {...props}>
      <div>MOCK_CHILDREN</div>
    </TextListTableContent>
  )[0]
}

describe('TextListTableContent', () => {
  let props: ComponentProps<typeof TextListTableContent>

  beforeEach(() => {
    props = {
      header: 'Test Header',
      listTableHeaders: ['Column 1', 'Column 2', 'Column 3'],
      children: 'Table content',
    }

    vi.mocked(ListTable).mockReturnValue(<div>MOCK_LIST_TABLE</div>)
  })

  it('renders header text correctly', () => {
    render(props)

    screen.getByText('Test Header')
  })

  it('renders a ListTable', () => {
    render(props)

    screen.getByText('MOCK_LIST_TABLE')
  })
})
