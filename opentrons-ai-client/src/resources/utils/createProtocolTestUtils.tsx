import { fireEvent, screen, waitFor } from '@testing-library/react'
import { expect } from 'vitest'

export async function fillApplicationSectionAndClickConfirm(): Promise<void> {
  const applicationDropdown = screen.getByText('Select an option')
  fireEvent.click(applicationDropdown)

  const basicAliquotingOption = screen.getByText('Basic aliquoting')
  fireEvent.click(basicAliquotingOption)

  const describeInput = screen.getByRole('textbox')
  fireEvent.change(describeInput, { target: { value: 'Test description' } })

  const confirmButton = screen.getByText('Confirm')
  await waitFor(() => {
    expect(confirmButton).toBeEnabled()
  })
  fireEvent.click(confirmButton)
}

export async function fillInstrumentsSectionAndClickConfirm(): Promise<void> {
  const leftMount = screen.getAllByText('Choose pipette')[0]
  fireEvent.click(leftMount)
  fireEvent.click(screen.getByText('Flex 1-Channel 50 μL'))

  const rightMount = screen.getAllByText('Choose pipette')[0]
  fireEvent.click(rightMount)
  fireEvent.click(screen.getByText('Flex 8-Channel 50 μL'))

  const confirmButton = screen.getByText('Confirm')
  await waitFor(() => {
    expect(confirmButton).toBeEnabled()
  })
  fireEvent.click(confirmButton)
}
