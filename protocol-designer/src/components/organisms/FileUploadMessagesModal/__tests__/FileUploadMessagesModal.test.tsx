import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '../../../../assets/localization'
import { renderWithProviders } from '../../../../__testing-utils__'
import { getFileUploadMessages } from '../../../../load-file/selectors'
import {
  dismissFileUploadMessage,
  undoLoadFile,
} from '../../../../load-file/actions'
import { useFileUploadModalContents } from '../utils'
import { FileUploadMessagesModal } from '..'

vi.mock('../utils')
vi.mock('../../../../load-file/selectors')
vi.mock('../../../../load-file/actions')

const render = () => {
  return renderWithProviders(<FileUploadMessagesModal />, {
    i18nInstance: i18n,
  })[0]
}

describe('FileUploadMessagesModal', () => {
  beforeEach(() => {
    vi.mocked(getFileUploadMessages).mockReturnValue({
      isError: true,
      errorType: 'INVALID_FILE_TYPE',
    })
    vi.mocked(useFileUploadModalContents).mockReturnValue({
      body: 'mockBody',
      title: 'mockTitle',
    })
  })

  it('renders modal for invalid file', () => {
    render()
    screen.getByText('mockTitle')
    screen.getByText('mockBody')
  })
  it('renders modal for a migration', () => {
    vi.mocked(getFileUploadMessages).mockReturnValue({
      isError: false,
      messageKey: 'DID_MIGRATE',
      migrationsRan: ['8.1.0'],
    })
    render()
    screen.getByText('mockTitle')
    screen.getByText('mockBody')
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(vi.mocked(dismissFileUploadMessage)).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(vi.mocked(undoLoadFile)).toHaveBeenCalled()
  })
})
