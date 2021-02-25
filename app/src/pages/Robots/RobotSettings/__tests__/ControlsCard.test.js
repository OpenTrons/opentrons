// @flow
import * as React from 'react'
import { mountWithProviders } from '@opentrons/components/__utils__'

import { i18n } from '../../../../i18n'
import * as RobotControls from '../../../../redux/robot-controls'
import * as RobotAdmin from '../../../../redux/robot-admin'
import * as RobotSelectors from '../../../../redux/robot/selectors'

import { ControlsCard } from '../ControlsCard'
import { CONNECTABLE, UNREACHABLE } from '../../../../redux/discovery'

import type { State, Action } from '../../../../redux/types'
import type { ViewableRobot } from '../../../../redux/discovery/types'

jest.mock('../../../../redux/robot-controls/selectors')
jest.mock('../../../../redux/robot/selectors')
jest.mock('../../../../redux/sessions/selectors')
jest.mock('../../../../redux/calibration/selectors')

jest.mock('../CheckCalibrationControl', () => ({
  CheckCalibrationControl: () => <></>,
}))

const mockRobot: ViewableRobot = ({
  name: 'robot-name',
  connected: true,
  status: CONNECTABLE,
}: any)

const mockUnconnectableRobot: ViewableRobot = ({
  name: 'robot-name',
  connected: true,
  status: UNREACHABLE,
}: any)

const mockGetLightsOn: JestMockFn<
  [State, string],
  $Call<typeof RobotControls.getLightsOn, State, string>
> = RobotControls.getLightsOn

const mockGetIsRunning: JestMockFn<
  [State],
  $Call<typeof RobotSelectors.getIsRunning, State>
> = RobotSelectors.getIsRunning

const MOCK_STATE: State = ({ mockState: true }: any)

describe('ControlsCard', () => {
  const render = (robot: ViewableRobot = mockRobot) => {
    return mountWithProviders<_, State, Action>(
      <ControlsCard robot={robot} />,
      {
        initialState: MOCK_STATE,
        i18n,
      }
    )
  }

  const getHomeButton = wrapper => wrapper.find('button[children="home"]')

  const getRestartButton = wrapper => wrapper.find('button[children="restart"]')

  const getLightsButton = wrapper => wrapper.find('ToggleBtn[label="lights"]')

  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.clearAllTimers()
    jest.resetAllMocks()
    jest.useRealTimers()
  })

  it('calls fetchLights on mount', () => {
    const { store } = render()

    expect(store.dispatch).toHaveBeenCalledWith(
      RobotControls.fetchLights(mockRobot.name)
    )
  })

  it('calls updateLights with toggle on button click', () => {
    mockGetLightsOn.mockReturnValue(true)

    const { wrapper, store } = render()

    getLightsButton(wrapper).invoke('onClick')()

    expect(store.dispatch).toHaveBeenCalledWith(
      RobotControls.updateLights(mockRobot.name, false)
    )
  })

  it('calls restartRobot on button click', () => {
    const { wrapper, store } = render()

    getRestartButton(wrapper).invoke('onClick')()

    expect(store.dispatch).toHaveBeenCalledWith(
      RobotAdmin.restartRobot(mockRobot.name)
    )
  })

  it('calls home on button click', () => {
    const { wrapper, store } = render()

    getHomeButton(wrapper).invoke('onClick')()

    expect(store.dispatch).toHaveBeenCalledWith(
      RobotControls.home(mockRobot.name, RobotControls.ROBOT)
    )
  })

  it('home and restart buttons enabled if connected and not running', () => {
    mockGetIsRunning.mockReturnValue(false)

    const { wrapper } = render()

    expect(getHomeButton(wrapper).prop('disabled')).toBe(false)
    expect(getRestartButton(wrapper).prop('disabled')).toBe(false)
  })

  it('home and restart buttons disabled if not connectable', () => {
    const { wrapper } = render(mockUnconnectableRobot)

    expect(getHomeButton(wrapper).prop('disabled')).toBe(true)
    expect(getRestartButton(wrapper).prop('disabled')).toBe(true)
  })

  it('home, and restart buttons disabled if not connected', () => {
    const mockRobotNotConnected: ViewableRobot = ({
      name: 'robot-name',
      connected: false,
      status: CONNECTABLE,
    }: any)

    const { wrapper } = render(mockRobotNotConnected)

    expect(getHomeButton(wrapper).prop('disabled')).toBe(true)
    expect(getRestartButton(wrapper).prop('disabled')).toBe(true)
  })

  it('home and restart buttons disabled if protocol running', () => {
    mockGetIsRunning.mockReturnValue(true)

    const { wrapper } = render()

    expect(getHomeButton(wrapper).prop('disabled')).toBe(true)
    expect(getRestartButton(wrapper).prop('disabled')).toBe(true)
  })
})
