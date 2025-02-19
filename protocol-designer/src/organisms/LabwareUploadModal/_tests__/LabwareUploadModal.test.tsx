import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fireEvent, screen } from '@testing-library/react'
import { i18n } from '/protocol-designer/assets/localization'
import { renderWithProviders } from '/protocol-designer/__testing-utils__'
import { LabwareUploadModal } from '..'
import { getLabwareUploadMessage } from '/protocol-designer/labware-defs/selectors'
import { dismissLabwareUploadMessage } from '/protocol-designer/labware-defs/actions'

vi.mock('/protocol-designer/labware-defs/selectors')
vi.mock('/protocol-designer/labware-defs/actions')

const render = () => {
  return renderWithProviders(<LabwareUploadModal />, {
    i18nInstance: i18n,
  })[0]
}

describe('LabwareUploadModal', () => {
  beforeEach(() => {
    vi.mocked(getLabwareUploadMessage).mockReturnValue({
      messageType: 'NOT_JSON',
    })
  })

  it('renders modal for not json', () => {
    render()
    screen.getByText(
      'Protocol Designer only accepts custom JSON labware definitions made with our Labware Creator. Upload a valid file to continue.'
    )
    screen.getByText('Invalid file type')
    fireEvent.click(
      screen.getByTestId('ModalHeader_icon_close_Invalid file type')
    )
    expect(vi.mocked(dismissLabwareUploadMessage)).toHaveBeenCalled()
  })
})
