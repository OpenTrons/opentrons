import * as React from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { describe, it, beforeEach, vi, expect } from 'vitest'

import { renderWithProviders } from '../../../__testing-utils__'
import { i18n } from '../../../i18n'
import { DeckConfigurationDiscardChangesModal } from '../DeckConfigurationDiscardChangesModal'

const mockFunc = vi.fn()
const mockGoBack = vi.fn()

vi.mock('react-router-dom', () => {
  const reactRouterDom = vi.requireActual('react-router-dom')
  return {
    ...reactRouterDom,
    useHistory: () => ({ goBack: mockGoBack } as any),
  }
})

const render = (
  props: React.ComponentProps<typeof DeckConfigurationDiscardChangesModal>
) => {
  return renderWithProviders(
    <DeckConfigurationDiscardChangesModal {...props} />,
    {
      i18nInstance: i18n,
    }
  )
}

describe('DeckConfigurationDiscardChangesModal', () => {
  let props: React.ComponentProps<typeof DeckConfigurationDiscardChangesModal>

  beforeEach(() => {
    props = {
      setShowConfirmationModal: mockFunc,
    }
  })
  it('should render text and buttons', () => {
    render(props)
    screen.getByText('Changes will be lost')
    screen.getByText(
      'Are you sure you want to exit without saving your deck configuration?'
    )
    screen.getByText('Discard changes')
    screen.getByText('Continue editing')
  })

  it('should call a mock function when tapping discard changes button', () => {
    render(props)
    fireEvent.click(screen.getByText('Discard changes'))
    expect(mockFunc).toHaveBeenCalledWith(false)
    expect(mockGoBack).toHaveBeenCalled()
  })

  it('should call a mock function when tapping continue editing button', () => {
    render(props)
    fireEvent.click(screen.getByText('Continue editing'))
    expect(mockFunc).toHaveBeenCalledWith(false)
  })
})
