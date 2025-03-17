import { describe, expect, it, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'

import { renderWithProviders } from '/app/__testing-utils__'
import { DeckInfoLabelTextTag } from '..'

import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof DeckInfoLabelTextTag>) => {
  return renderWithProviders(<DeckInfoLabelTextTag {...props} />)[0]
}

describe('DeckInfoLabelTextTag', () => {
  let props: ComponentProps<typeof DeckInfoLabelTextTag>

  beforeEach(() => {
    const mockLabels = [
      <div key="label1" data-testid="label-1">
        Label 1
      </div>,
      <div key="label2" data-testid="label-2">
        Label 2
      </div>,
      <div key="label3" data-testid="label-3">
        Label 3
      </div>,
    ]

    const mockTag = <div data-testid="mock-tag">Tag</div>

    props = {
      colOneDeckInfoLabels: mockLabels,
      colTwoText: 'Sample Text',
      colThreeTag: mockTag,
    }
  })

  it('renders all labels when fewer than the maximum supported labels are provided', () => {
    props.colOneDeckInfoLabels = props.colOneDeckInfoLabels.slice(0, 2)

    render(props)

    expect(screen.getByTestId('label-1')).toBeInTheDocument()
    expect(screen.getByTestId('label-2')).toBeInTheDocument()
    expect(screen.queryByTestId('label-3')).not.toBeInTheDocument()
  })

  it('limits rendering to the maximum supported labels when more labels are provided', () => {
    props.colOneDeckInfoLabels = [
      ...props.colOneDeckInfoLabels,
      <div key="label4" data-testid="label-4">
        Label 4
      </div>,
    ]

    render(props)

    expect(screen.getByTestId('label-1')).toBeInTheDocument()
    expect(screen.getByTestId('label-2')).toBeInTheDocument()
    expect(screen.getByTestId('label-3')).toBeInTheDocument()
    expect(screen.queryByTestId('label-4')).not.toBeInTheDocument()
  })

  it('renders the component with all three columns', () => {
    render(props)

    expect(screen.getByTestId('label-1')).toBeInTheDocument()
    expect(screen.getByText('Sample Text')).toBeInTheDocument()
    expect(screen.getByTestId('mock-tag')).toBeInTheDocument()
  })
})
