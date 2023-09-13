import * as React from 'react'
import { i18n } from '../../../i18n'
import { fireEvent } from '@testing-library/react'
import * as Shell from '../../../redux/shell'
import { renderWithProviders } from '@opentrons/components'
import { UpdateAppModal, UpdateAppModalProps } from '..'

import type { State } from '../../../redux/types'
import type { ShellUpdateState } from '../../../redux/shell/types'

jest.mock('../../../redux/shell/update', () => ({
  ...jest.requireActual<{}>('../../../redux/shell/update'),
  getShellUpdateState: jest.fn(),
}))

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useHistory: () => ({
    push: jest.fn(),
  }),
}))

const getShellUpdateState = Shell.getShellUpdateState as jest.MockedFunction<
  typeof Shell.getShellUpdateState
>

const render = (props: React.ComponentProps<typeof UpdateAppModal>) => {
  return renderWithProviders(<UpdateAppModal {...props} />, {
    i18nInstance: i18n,
  })
}

describe('UpdateAppModal', () => {
  let props: React.ComponentProps<typeof UpdateAppModal>

  beforeEach(() => {
    props = {
      closeModal: jest.fn(),
    } as UpdateAppModalProps
    getShellUpdateState.mockImplementation((state: State) => {
      return {
        downloading: false,
        available: true,
        downloaded: false,
        downloadPercentage: 0,
        error: null,
        info: {
          version: '1.2.3',
          releaseNotes: 'this is a release',
        },
      } as ShellUpdateState
    })
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders update available title and release notes when update is available', () => {
    const [{ getByText }] = render(props)
    expect(getByText('Opentrons App Update Available')).toBeInTheDocument()
    expect(getByText('this is a release')).toBeInTheDocument()
  })
  it('closes modal when "remind me later" button is clicked', () => {
    const closeModal = jest.fn()
    const [{ getByText }] = render({ ...props, closeModal })
    fireEvent.click(getByText('Remind me later'))
    expect(closeModal).toHaveBeenCalled()
  })
  it('shows error modal on error', () => {
    getShellUpdateState.mockReturnValue({
      error: {
        message: 'Could not get code signature for running application',
        name: 'Error',
      },
    } as ShellUpdateState)
    const [{ getByText }] = render(props)
    expect(getByText('Update Error')).toBeInTheDocument()
  })
  it('shows a download progress bar when downloading', () => {
    getShellUpdateState.mockReturnValue({
      downloading: true,
      downloadPercentage: 50,
    } as ShellUpdateState)
    const [{ getByText, getByRole }] = render(props)
    expect(getByText('Downloading update...')).toBeInTheDocument()
    expect(getByRole('progressbar')).toBeInTheDocument()
  })
  it('renders download complete text when download is finished', () => {
    getShellUpdateState.mockReturnValue({
      downloading: false,
      downloaded: true,
    } as ShellUpdateState)
    const [{ getByText, getByRole }] = render(props)
    expect(
      getByText('Download complete, restarting the app...')
    ).toBeInTheDocument()
    expect(getByRole('progressbar')).toBeInTheDocument()
  })
  it('renders an error message when an error occurs', () => {
    getShellUpdateState.mockReturnValue({
      error: { name: 'Update Error' },
    } as ShellUpdateState)
    const [{ getByTitle }] = render(props)
    expect(getByTitle('Update Error')).toBeInTheDocument()
  })
})
