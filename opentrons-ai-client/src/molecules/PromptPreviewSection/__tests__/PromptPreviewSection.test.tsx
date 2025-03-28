import { screen } from '@testing-library/react'
import { describe, it, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'

import { PromptPreviewSection } from '../index'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof PromptPreviewSection>) => {
  return renderWithProviders(<PromptPreviewSection {...props} />, {
    i18nInstance: i18n,
  })
}

describe('PromptPreviewSection', () => {
  let props: ComponentProps<typeof PromptPreviewSection>

  beforeEach(() => {
    props = {
      title: 'Test Section',
      items: ['test item 1', 'test item 2'],
    }
  })

  it('should render the PromptPreviewSection component', () => {
    render(props)

    expect(screen.getByText('Test Section')).toBeInTheDocument()
  })

  it('should render the section title', () => {
    render(props)

    expect(screen.getByText('Test Section')).toBeInTheDocument()
  })

  it('should render the items', () => {
    render(props)

    expect(screen.getByText('test item 1')).toBeInTheDocument()
    expect(screen.getByText('test item 2')).toBeInTheDocument()
  })

  it("should not render the item tag if it's an empty string", () => {
    props.items = ['test item 1', '']
    render(props)

    const items = screen.getAllByTestId('Tag_default')
    expect(items).toHaveLength(1)
  })

  it('should render the item with the correct max item width', () => {
    props.items = ['test item 1 long text long text long text long text']
    props.itemMaxWidth = '23%'
    render(props)

    const item = screen.getByTestId('item-tag-wrapper-0')
    expect(item).toHaveStyle({ maxWidth: '23%' })
  })
})
