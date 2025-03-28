import { describe, expect, it, beforeEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '/app/__testing-utils__'
import { MultiDeckLabelTagBtns } from '..'
import type { ComponentProps } from 'react'

const render = (props: ComponentProps<typeof MultiDeckLabelTagBtns>) => {
  return renderWithProviders(<MultiDeckLabelTagBtns {...props} />)[0]
}

describe('MultiDeckLabelTagBtns', () => {
  let props: ComponentProps<typeof MultiDeckLabelTagBtns>
  const onClickPrimary = vi.fn()
  const onClickSecondary = vi.fn()
  const mockTag = <div data-testid="mock-tag">Tag</div>
  const mockChip = <div data-testid="mock-chip">Chip</div>
  const mockLabels = [
    <div key="label1" data-testid="mock-label-1">
      Label 1
    </div>,
    <div key="label2" data-testid="mock-label-2">
      Label 2
    </div>,
    <div key="label3" data-testid="mock-label-3">
      Label 3
    </div>,
  ]

  beforeEach(() => {
    onClickPrimary.mockReset()
    onClickSecondary.mockReset()

    props = {
      colOneDeckInfoLabels: mockLabels,
      colTwoTag: mockTag,
      colTwoChip: mockChip,
      colThreePrimaryBtn: {
        buttonText: 'Primary Button',
        onClick: onClickPrimary,
      },
      colThreeSecondaryBtn: {
        buttonText: 'Secondary Button',
        onClick: onClickSecondary,
      },
    }
  })

  it('renders the primary button with correct text', () => {
    render(props)
    expect(screen.getAllByText('Primary Button')[0]).toBeInTheDocument()
  })

  it('renders the secondary button with correct text', () => {
    render(props)
    expect(screen.getAllByText('Secondary Button')[0]).toBeInTheDocument()
  })

  it('calls the correct function when primary button is clicked', () => {
    render(props)
    const primaryButton = screen.getAllByText('Primary Button')[0]
    fireEvent.click(primaryButton)
    expect(onClickPrimary).toHaveBeenCalledTimes(1)
    expect(onClickSecondary).not.toHaveBeenCalled()
  })

  it('calls the correct function when secondary button is clicked', () => {
    render(props)
    const secondaryButton = screen.getAllByText('Secondary Button')[0]
    fireEvent.click(secondaryButton)
    expect(onClickSecondary).toHaveBeenCalledTimes(1)
    expect(onClickPrimary).not.toHaveBeenCalled()
  })

  it('does not render secondary button when not provided', () => {
    const propsWithoutSecondary = { ...props, colThreeSecondaryBtn: undefined }
    render(propsWithoutSecondary)
    expect(screen.getAllByText('Primary Button')[0]).toBeInTheDocument()
    expect(screen.queryByText('Secondary Button')).not.toBeInTheDocument()
  })

  it('respects the disabled state of the primary button', () => {
    const disabledProps = {
      ...props,
      colThreePrimaryBtn: {
        ...props.colThreePrimaryBtn,
        disabled: true,
      },
    }
    render(disabledProps)

    fireEvent.click(screen.getAllByText('Primary Button')[0])
    expect(onClickPrimary).not.toHaveBeenCalled()
  })

  it('respects the disabled state of the secondary button', () => {
    const disabledProps = {
      ...props,
      colThreeSecondaryBtn: {
        onClick: onClickSecondary,
        buttonText: 'Secondary Button',
        disabled: true,
      },
    }
    render(disabledProps)

    fireEvent.click(screen.getAllByText('Secondary Button')[0])
    expect(onClickSecondary).not.toHaveBeenCalled()
  })
})
