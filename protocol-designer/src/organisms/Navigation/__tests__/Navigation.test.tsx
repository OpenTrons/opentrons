import { describe, it, vi, beforeEach, expect } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { getHasUnsavedChanges } from '/protocol-designer/load-file/selectors'
import { toggleNewProtocolModal } from '/protocol-designer/navigation/actions'
import { SettingsIcon } from '/protocol-designer/organisms/SettingsIcon'
import { Navigation } from '..'

vi.mock('/protocol-designer/organisms/SettingsIcon')
vi.mock('/protocol-designer/navigation/actions')
vi.mock('/protocol-designer/file-data/selectors')
vi.mock('/protocol-designer/load-file/selectors')
const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <Navigation />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('Navigation', () => {
  beforeEach(() => {
    vi.mocked(getHasUnsavedChanges).mockReturnValue(false)
    vi.mocked(SettingsIcon).mockReturnValue(<div>mock SettingsIcon</div>)
  })
  it('should render text and link button', () => {
    render()
    screen.getByText('Opentrons')
    screen.getByText('Protocol Designer')
    screen.getByText('Version fake_PD_version')
    screen.getByText('Create new')
    screen.getByText('Import')
    screen.getByText('mock SettingsIcon')
  })

  it('when clicking Create new, should call the toggle action', () => {
    render()
    fireEvent.click(screen.getByText('Create new'))
    expect(vi.mocked(toggleNewProtocolModal)).toHaveBeenCalled()
  })

  it.todo('when clicking Import, mock function should be called', () => {})
})
