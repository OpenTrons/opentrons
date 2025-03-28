import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, expect, vi } from 'vitest'

import { renderWithProviders } from '../../../__testing-utils__'
import { reagentTransfer } from '../../../assets/prompts'
import { PromptButton } from '../index'

import type { ComponentProps } from 'react'
import type * as ReactHookForm from 'react-hook-form'

vi.mock('react-hook-form', async importOriginal => {
  const actual = await importOriginal<typeof ReactHookForm>()
  return {
    ...actual,
    useFormContext: vi.fn(() => ({
      setValue: mockSetValue,
    })),
  }
})

const render = (props: ComponentProps<typeof PromptButton>) => {
  return renderWithProviders(<PromptButton {...props} />)
}

let mockSetValue = vi.fn()

describe('PromptButton', () => {
  let props: ComponentProps<typeof PromptButton>

  beforeEach(() => {
    props = {
      buttonText: 'Reagent Transfer',
    }
    mockSetValue = vi.fn()
  })

  it('should render text', () => {
    render(props)
    screen.getByRole('button', { name: 'Reagent Transfer' })
  })

  it('should render reagent transfer text into the form', () => {
    render(props)
    const button = screen.getByRole('button', { name: 'Reagent Transfer' })
    fireEvent.click(button)
    expect(mockSetValue).toHaveBeenCalledWith('userPrompt', reagentTransfer)
    fireEvent.click(button)
  })
})
