import * as React from 'react'
import '@testing-library/jest-dom'
import { fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { renderWithProviders } from '@opentrons/components'
import { i18n } from '../../../i18n'
import { UploadInput } from '../UploadInput'

describe('UploadInput', () => {
  let onUpload: jest.MockedFunction<() => {}>
  let render: () => ReturnType<typeof renderWithProviders>[0]

  beforeEach(() => {
    onUpload = jest.fn()
    render = () => {
      return renderWithProviders(
        <BrowserRouter>
          <UploadInput onUpload={onUpload} />
        </BrowserRouter>,
        {
          i18nInstance: i18n,
        }
      )[0]
    }
  })
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('renders correct contents for empty state', () => {
    const { findByText, getByRole } = render()

    getByRole('button', { name: 'Choose File' })
    findByText('Drag and drop or')
    findByText('your files')
    getByRole('button', { name: 'browse' })
  })

  it('opens file select on button click', () => {
    const { getByRole, getByTestId } = render()
    const button = getByRole('button', { name: 'Choose File' })
    const input = getByTestId('file_input')
    input.click = jest.fn()
    fireEvent.click(button)
    expect(input.click).toHaveBeenCalled()
  })
  it('calls onUpload callback on choose file', () => {
    const { getByTestId } = render()
    const input = getByTestId('file_input')
    fireEvent.change(input, { target: { files: [{ path: 'dummyFile' }] } })
    expect(onUpload).toHaveBeenCalled()
  })
})
