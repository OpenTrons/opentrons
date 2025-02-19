import { describe, it, vi, beforeEach, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { screen, fireEvent } from '@testing-library/react'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { loadProtocolFile } from '/protocol-designer/load-file/actions'
import { getFileMetadata } from '/protocol-designer/file-data/selectors'
import { toggleNewProtocolModal } from '/protocol-designer/navigation/actions'
import { useKitchen } from '/protocol-designer/organisms/Kitchen/hooks'
import { useAnnouncements } from '/protocol-designer/organisms/AnnouncementModal/announcements'
import { getHasOptedIn } from '/protocol-designer/analytics/selectors'
import { Landing } from '../index'

vi.mock('/protocol-designer/load-file/actions')
vi.mock('/protocol-designer/file-data/selectors')
vi.mock('/protocol-designer/navigation/actions')
vi.mock('/protocol-designer/organisms/AnnouncementModal/announcements')
vi.mock('/protocol-designer/organisms/Kitchen/hooks')
vi.mock('/protocol-designer/analytics/selectors')

const mockMakeSnackbar = vi.fn()
const mockEatToast = vi.fn()
const mockBakeToast = vi.fn()

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
    {
      i18nInstance: i18n,
    }
  )[0]
}

describe('Landing', () => {
  beforeEach(() => {
    vi.mocked(getHasOptedIn).mockReturnValue({
      hasOptedIn: false,
      appVersion: '8.2.1',
    })
    vi.mocked(getFileMetadata).mockReturnValue({})
    vi.mocked(loadProtocolFile).mockReturnValue(vi.fn())
    vi.mocked(useAnnouncements).mockReturnValue({} as any)
    vi.mocked(useKitchen).mockReturnValue({
      makeSnackbar: mockMakeSnackbar,
      bakeToast: mockBakeToast,
      eatToast: mockEatToast,
    })
  })

  it('renders the landing page image and text', () => {
    render()
    screen.getByLabelText('welcome image')
    screen.getByText('Welcome to Protocol Designer!')
    screen.getByText(
      'The easiest way to automate liquid handling on your Opentrons robot. No code required.'
    )
    fireEvent.click(screen.getByRole('button', { name: 'Create a protocol' }))
    expect(vi.mocked(toggleNewProtocolModal)).toHaveBeenCalled()
    screen.getByText('Import existing protocol')
    screen.getByRole('img', { name: 'welcome image' })
  })

  it('render toast when there is an announcement', () => {
    render()
    expect(mockBakeToast).toHaveBeenCalled()
  })
})
