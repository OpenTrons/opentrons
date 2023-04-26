import * as React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, waitFor } from '@testing-library/react'

import { i18n } from '../../../i18n'
import { renderWithProviders } from '@opentrons/components'
import { useTrackEvent } from '../../../redux/analytics'
import {
  getConnectableRobots,
  getReachableRobots,
} from '../../../redux/discovery'
import {
  mockConnectableRobot,
  mockReachableRobot,
} from '../../../redux/discovery/__fixtures__'

import { NameRobot } from '../NameRobot'

jest.mock('../../../redux/discovery/selectors')
jest.mock('../../../redux/analytics')

const mockGetConnectableRobots = getConnectableRobots as jest.MockedFunction<
  typeof getConnectableRobots
>
const mockGetReachableRobots = getReachableRobots as jest.MockedFunction<
  typeof getReachableRobots
>
const mockUseTrackEvent = useTrackEvent as jest.MockedFunction<
  typeof useTrackEvent
>
let mockTrackEvent: jest.Mock

const render = () => {
  return renderWithProviders(
    <MemoryRouter>
      <NameRobot />
    </MemoryRouter>,
    { i18nInstance: i18n }
  )
}

describe('NameRobot', () => {
  beforeEach(() => {
    mockTrackEvent = jest.fn()
    mockUseTrackEvent.mockReturnValue(mockTrackEvent)
    mockConnectableRobot.name = 'connectableOtie'
    mockReachableRobot.name = 'reachableOtie'
    mockGetConnectableRobots.mockReturnValue([mockConnectableRobot])
    mockGetReachableRobots.mockReturnValue([mockReachableRobot])
  })

  it('should render text, button and keyboard', () => {
    const [{ getByText, getByRole, queryByRole }] = render()
    getByText('Name your robot')
    getByText('Don’t worry, you can always change this in your settings.')
    getByText('Enter up to 17 characters (letters and numbers only)')
    getByRole('textbox')
    getByText('Confirm')
    // keyboard
    getByRole('button', { name: 'a' })
    expect(queryByRole('button', { name: 'enter' })).not.toBeInTheDocument()
  })

  it('should display a letter when typing a letter', () => {
    const [{ getByRole }] = render()
    const input = getByRole('textbox')
    fireEvent.click(getByRole('button', { name: 'a' }))
    fireEvent.click(getByRole('button', { name: 'b' }))
    fireEvent.click(getByRole('button', { name: 'c' }))
    expect(input).toHaveValue('abc')
  })

  it('should show an error message when tapping confirm without typing anything', async () => {
    const [{ findByText, getByLabelText }] = render()
    const button = getByLabelText('SmallButton_primary')
    fireEvent.click(button)
    const error = await findByText(
      'Oops! Robot name must be between 1 and 17 characters.'
    )
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })

  it('should show an error message when typing an existing name - connectable robot', async () => {
    const [{ getByRole, findByText, getByLabelText }] = render()
    const input = getByRole('textbox')
    fireEvent.change(input, {
      target: { value: 'connectableOtie' },
    })
    const nameButton = getByLabelText('SmallButton_primary')
    fireEvent.click(nameButton)
    const error = await findByText(
      'Oops! Name is already in use. Choose a different name.'
    )
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })

  it('should show an error message when typing an existing name - reachable robot', async () => {
    const [{ getByRole, findByText, getByLabelText }] = render()
    const input = getByRole('textbox')
    fireEvent.change(input, {
      target: { value: 'reachableOtie' },
    })
    const nameButton = getByLabelText('SmallButton_primary')
    fireEvent.click(nameButton)
    const error = await findByText(
      'Oops! Name is already in use. Choose a different name.'
    )
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })

  it('should call a mock function when tapping the confirm button', () => {
    const [{ getByRole, getByLabelText }] = render()
    fireEvent.click(getByRole('button', { name: 'a' }))
    fireEvent.click(getByRole('button', { name: 'b' }))
    fireEvent.click(getByRole('button', { name: 'c' }))
    const button = getByLabelText('SmallButton_primary')
    fireEvent.click(button)
    expect(mockTrackEvent).toHaveBeenCalled()
  })

  it.todo('should render text and button when coming from robot settings')
  // it('should render text and button when coming from robot settings', () => {
  //   const [{ getByText, queryByText }] = render()
  //   getByText('Name your robot')
  //   expect(
  //     queryByText('Don’t worry, you can always change this in your settings.')
  //   ).not.toBeInTheDocument()
  //   getByText('Enter up to 17 characters (letters and numbers only)')
  //   getByText('Confirm')
  // })
})
