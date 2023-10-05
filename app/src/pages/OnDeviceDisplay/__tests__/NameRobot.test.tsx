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
import { useIsUnboxingFlowOngoing } from '../../../organisms/RobotSettingsDashboard/NetworkSettings/hooks'
import {
  mockConnectableRobot,
  mockReachableRobot,
} from '../../../redux/discovery/__fixtures__'

import { NameRobot } from '../NameRobot'

jest.mock('../../../redux/discovery/selectors')
jest.mock('../../../redux/config')
jest.mock('../../../redux/analytics')
jest.mock('../../../organisms/RobotSettingsDashboard/NetworkSettings/hooks')

const mockPush = jest.fn()

jest.mock('react-router-dom', () => {
  const reactRouterDom = jest.requireActual('react-router-dom')
  return {
    ...reactRouterDom,
    useHistory: () => ({ push: mockPush } as any),
  }
})

const mockGetConnectableRobots = getConnectableRobots as jest.MockedFunction<
  typeof getConnectableRobots
>
const mockGetReachableRobots = getReachableRobots as jest.MockedFunction<
  typeof getReachableRobots
>
const mockUseTrackEvent = useTrackEvent as jest.MockedFunction<
  typeof useTrackEvent
>
const mockuseIsUnboxingFlowOngoing = useIsUnboxingFlowOngoing as jest.MockedFunction<
  typeof useIsUnboxingFlowOngoing
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
    mockuseIsUnboxingFlowOngoing.mockReturnValue(true)
  })

  it('should render text, button and keyboard', () => {
    const [{ getByText, getByRole }] = render()
    getByText('Name your robot')
    getByText('Don’t worry, you can always change this in your settings.')
    getByText('Enter up to 17 characters (letters and numbers only)')
    getByRole('textbox')
    getByText('Confirm')
    // keyboard
    getByRole('button', { name: 'a' })
  })

  it('should display a letter when typing a letter', () => {
    const [{ getByRole }] = render()
    const input = getByRole('textbox')
    getByRole('button', { name: 'a' }).click()
    getByRole('button', { name: 'b' }).click()
    getByRole('button', { name: 'c' }).click()
    expect(input).toHaveValue('abc')
  })

  it('should show an error message when tapping confirm without typing anything', async () => {
    const [{ findByText, getByLabelText }] = render()
    getByLabelText('SmallButton_primary').click()
    const error = await findByText(
      'Oops! Robot name must follow the character count and limitations.'
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
    getByLabelText('SmallButton_primary').click()
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
    getByLabelText('SmallButton_primary').click()
    const error = await findByText(
      'Oops! Name is already in use. Choose a different name.'
    )
    await waitFor(() => {
      expect(error).toBeInTheDocument()
    })
  })

  it('should call a mock function when tapping the confirm button', () => {
    const [{ getByRole, getByLabelText }] = render()
    getByRole('button', { name: 'a' }).click()
    getByRole('button', { name: 'b' }).click()
    getByRole('button', { name: 'c' }).click()
    getByLabelText('SmallButton_primary').click()
    expect(mockTrackEvent).toHaveBeenCalled()
  })

  it('should render text and button when coming from robot settings', () => {
    mockuseIsUnboxingFlowOngoing.mockReturnValue(false)
    const [{ getByText, queryByText }] = render()
    getByText('Rename robot')
    expect(
      queryByText('Don’t worry, you can always change this in your settings.')
    ).not.toBeInTheDocument()
    getByText('Enter up to 17 characters (letters and numbers only)')
    getByText('Confirm')
  })

  it('should call a mock function when tapping back button', () => {
    mockuseIsUnboxingFlowOngoing.mockReturnValue(false)
    const [{ getByTestId }] = render()
    getByTestId('name_back_button').click()
    expect(mockPush).toHaveBeenCalledWith('/robot-settings')
  })
})
