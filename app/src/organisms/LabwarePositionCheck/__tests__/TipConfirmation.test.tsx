import { i18n } from '../../../i18n'
import { TipConfirmation } from '../TipConfirmation'
import { renderWithProviders } from '@opentrons/components'
import { resetAllWhenMocks } from 'jest-when'
import * as React from 'react'

const render = (props: React.ComponentProps<typeof TipConfirmation>) => {
  return renderWithProviders(<TipConfirmation {...props} />, {
    i18nInstance: i18n,
  })[0]
}

describe('TipConfirmation', () => {
  let props: React.ComponentProps<typeof TipConfirmation>

  beforeEach(() => {
    props = {
      invalidateTip: jest.fn(),
      confirmTip: jest.fn(),
    }
  })
  afterEach(() => {
    resetAllWhenMocks()
    jest.restoreAllMocks()
  })
  it('should render correct copy', () => {
    const { getByText, getByRole } = render(props)
    getByText('Did pipette pick up tip successfully?')
    getByRole('button', { name: 'Yes' })
    getByRole('button', { name: 'Try again' })
  })
  it('should invoke callback props when ctas are clicked', () => {
    const { getByRole } = render(props)
    getByRole('button', { name: 'Try again' }).click()
    expect(props.invalidateTip).toHaveBeenCalled()
    getByRole('button', { name: 'Yes' }).click()
    expect(props.confirmTip).toHaveBeenCalled()
  })
})
