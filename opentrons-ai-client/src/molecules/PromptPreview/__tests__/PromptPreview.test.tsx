import { screen } from '@testing-library/react'
import { describe, it, vi, beforeEach, expect } from 'vitest'
import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { PromptPreview } from '..'

import type { ComponentProps } from 'react'

const PROMPT_PREVIEW_PLACEHOLDER_MESSAGE =
  'As you complete the sections on the left, your prompt will be built here. When all requirements are met you will be able to generate the protocol.'

const mockHandleClick = vi.fn()

const render = (props: ComponentProps<typeof PromptPreview>) => {
  return renderWithProviders(<PromptPreview {...props} />, {
    i18nInstance: i18n,
  })
}

describe('PromptPreview', () => {
  let props: ComponentProps<typeof PromptPreview>

  beforeEach(() => {
    props = {
      isSubmitButtonEnabled: false,
      handleSubmit: () => {
        mockHandleClick()
      },
      promptPreviewData: [
        {
          title: 'Test Section 1',
          items: ['item1', 'item2'],
        },
        {
          title: 'Test Section 2',
          items: ['item3', 'item4'],
        },
      ],
    }
  })

  it('should render the PromptPreview component', () => {
    render(props)

    expect(screen.getByText('Prompt')).toBeInTheDocument()
  })

  it('should render the submit button', () => {
    render(props)

    expect(screen.getByText('Submit prompt')).toBeInTheDocument()
  })

  it('should render the placeholder message when all sections are empty', () => {
    props.promptPreviewData = [
      {
        title: 'Test Section 1',
        items: [],
      },
      {
        title: 'Test Section 2',
        items: [],
      },
    ]
    render(props)

    expect(
      screen.getByText(PROMPT_PREVIEW_PLACEHOLDER_MESSAGE)
    ).toBeInTheDocument()
  })

  it('should not render the placeholder message when at least one section has items', () => {
    render(props)

    expect(
      screen.queryByText(PROMPT_PREVIEW_PLACEHOLDER_MESSAGE)
    ).not.toBeInTheDocument()
  })

  it('should render the sections with items', () => {
    render(props)

    expect(screen.getByText('Test Section 1')).toBeInTheDocument()
    expect(screen.getByText('Test Section 2')).toBeInTheDocument()
  })

  it('should display submit button disabled when isSubmitButtonEnabled is false', () => {
    render(props)

    expect(screen.getByRole('button', { name: 'Submit prompt' })).toBeDisabled()
  })

  it('should display submit button enabled when isSubmitButtonEnabled is true', () => {
    props.isSubmitButtonEnabled = true
    render(props)

    expect(
      screen.getByRole('button', { name: 'Submit prompt' })
    ).not.toBeDisabled()
  })

  it('should call handleSubmit when the submit button is clicked', () => {
    props.isSubmitButtonEnabled = true
    render(props)

    const submitButton = screen.getByRole('button', { name: 'Submit prompt' })
    submitButton.click()

    expect(mockHandleClick).toHaveBeenCalled()
  })
})
