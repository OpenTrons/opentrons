import { fireEvent, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { i18n } from '/app/i18n'
import {
  getIsLabwareOffsetCodeSnippetsOn,
  updateConfigValue,
} from '/app/redux/config'
import { renderWithProviders } from '/app/__testing-utils__'
import { ShowLabwareOffsetSnippets } from '../ShowLabwareOffsetSnippets'

vi.mock('/app/redux/config')

const render = () => {
  return (
    renderWithProviders(<ShowLabwareOffsetSnippets />),
    {
      i18nInstance: i18n,
    }
  )
}

describe('ShowLabwareOffsetSnippets', () => {
  beforeEach(() => {
    vi.mocked(getIsLabwareOffsetCodeSnippetsOn).mockReturnValue(true)
  })
  it('renders the display show link to get labware offset data section', () => {
    render()
    screen.getByText('Show Labware Offset data code snippets')
    screen.getByText(
      'Only for users who need to apply labware offset data outside of the Opentrons App. When enabled, code snippets for Jupyter Notebook and SSH are available during protocol setup after configuring all required offsets.'
    )
    screen.getByRole('switch', { name: 'show_link_to_get_labware_offset_data' })
  })

  it('should call a mock function when clicking toggle button', () => {
    render()
    const toggleButton = screen.getByRole('switch', {
      name: 'show_link_to_get_labware_offset_data',
    })
    fireEvent.click(toggleButton)
    expect(vi.mocked(updateConfigValue)).toHaveBeenCalledWith(
      'labware.showLabwareOffsetCodeSnippets',
      false
    )
  })
})
