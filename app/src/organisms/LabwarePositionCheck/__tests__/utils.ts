import { screen, fireEvent } from '@testing-library/react'

// TODO(jh, 02-06-25): Find a good place for testing utils. This is also used in Error Recovery.
export function clickButtonLabeled(label: string): void {
  const buttons = screen.getAllByRole('button', { name: label })
  fireEvent.click(buttons[0])
}
