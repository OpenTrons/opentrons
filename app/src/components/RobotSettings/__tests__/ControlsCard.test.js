// @flow
import * as React from 'react'
import { Provider } from 'react-redux'
import { mount } from 'enzyme'
import { MemoryRouter } from 'react-router-dom'

import * as RobotControls from '../../../robot-controls'
import * as RobotAdmin from '../../../robot-admin'
import * as RobotSelectors from '../../../robot/selectors'
import { ControlsCard } from '../ControlsCard'
import { LabeledToggle, LabeledButton } from '@opentrons/components'
import { CONNECTABLE, REACHABLE } from '../../../discovery'

import type { State } from '../../../types'
import type { ViewableRobot } from '../../../discovery/types'

jest.mock('../../../robot-controls/selectors')
jest.mock('../../../robot/selectors')

const mockRobot: ViewableRobot = ({
  name: 'robot-name',
  connected: true,
  status: CONNECTABLE,
}: any)

const mockUnconnectableRobot: ViewableRobot = ({
  name: 'robot-name',
  connected: true,
  status: REACHABLE,
}: any)

const mockGetLightsOn: JestMockFn<
  [State, string],
  $Call<typeof RobotControls.getLightsOn, State, string>
> = RobotControls.getLightsOn

const mockGetIsRunning: JestMockFn<
  [State],
  $Call<typeof RobotSelectors.getIsRunning, State>
> = RobotSelectors.getIsRunning

describe('ControlsCard', () => {
  let mockStore

  const getDeckCalButton = wrapper =>
    wrapper
      .find({ label: 'Calibrate deck' })
      .find(LabeledButton)
      .find('button')

  const getRobotCalibrationCheckButton = wrapper =>
    wrapper
      .find({ label: 'Check deck calibration' })
      .find(LabeledButton)
      .find('a')

  const getHomeButton = wrapper =>
    wrapper
      .find({ label: 'Home all axes' })
      .find(LabeledButton)
      .find('button')

  const getRestartButton = wrapper =>
    wrapper
      .find({ label: 'Restart robot' })
      .find(LabeledButton)
      .find('button')

  const getLightsButton = wrapper =>
    wrapper.find({ label: 'Lights' }).find(LabeledToggle)

  beforeEach(() => {
    mockStore = {
      subscribe: () => {},
      getState: () => ({
        mockState: true,
        config: { devInternal: { enableRobotCalCheck: true } },
      }),
      dispatch: jest.fn(),
    }
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('calls fetchLights on mount', () => {
    mount(
      <Provider store={mockStore}>
        <MemoryRouter>
          <ControlsCard
            robot={mockRobot}
            checkCalibrationUrl="/check-deck"
            calibrateDeckUrl="/deck/calibrate"
          />
        </MemoryRouter>
      </Provider>
    )

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      RobotControls.fetchLights(mockRobot.name)
    )
  })

  it('calls updateLights with toggle on button click', () => {
    mockGetLightsOn.mockReturnValue(true)

    const wrapper = mount(
      <Provider store={mockStore}>
        <MemoryRouter>
          <ControlsCard
            robot={mockRobot}
            checkCalibrationUrl="/check-deck"
            calibrateDeckUrl="/deck/calibrate"
          />
        </MemoryRouter>
      </Provider>
    )

    getLightsButton(wrapper).invoke('onClick')()

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      RobotControls.updateLights(mockRobot.name, false)
    )
  })

  it('calls restartRobot on button click', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <MemoryRouter>
          <ControlsCard
            robot={mockRobot}
            checkCalibrationUrl="/check-deck"
            calibrateDeckUrl="/deck/calibrate"
          />
        </MemoryRouter>
      </Provider>
    )

    getRestartButton(wrapper).invoke('onClick')()

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      RobotAdmin.restartRobot(mockRobot.name)
    )
  })

  it('calls home on button click', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <MemoryRouter>
          <ControlsCard
            robot={mockRobot}
            checkCalibrationUrl="/check-deck"
            calibrateDeckUrl="/deck/calibrate"
          />
        </MemoryRouter>
      </Provider>
    )

    getHomeButton(wrapper).invoke('onClick')()

    expect(mockStore.dispatch).toHaveBeenCalledWith(
      RobotControls.home(mockRobot.name, RobotControls.ROBOT)
    )
  })

  it('DC, home, and restart buttons enabled if connected and not running', () => {
    mockGetIsRunning.mockReturnValue(false)

    const wrapper = mount(
      <Provider store={mockStore}>
        <MemoryRouter>
          <ControlsCard
            robot={mockUnconnectableRobot}
            checkCalibrationUrl="/check-deck"
            calibrateDeckUrl="/deck/calibrate"
          />
        </MemoryRouter>
      </Provider>
    )

    expect(getDeckCalButton(wrapper).prop('disabled')).toBe(true)
    expect(getRobotCalibrationCheckButton(wrapper).prop('disabled')).toBe(true)
    expect(getHomeButton(wrapper).prop('disabled')).toBe(true)
    expect(getRestartButton(wrapper).prop('disabled')).toBe(true)
  })

  it('DC, home, and restart buttons disabled if not connectable', () => {
    const wrapper = mount(
      <Provider store={mockStore}>
        <MemoryRouter>
          <ControlsCard
            robot={mockUnconnectableRobot}
            checkCalibrationUrl="/check-deck"
            calibrateDeckUrl="/deck/calibrate"
          />
        </MemoryRouter>
      </Provider>
    )

    expect(getDeckCalButton(wrapper).prop('disabled')).toBe(true)
    expect(getRobotCalibrationCheckButton(wrapper).prop('disabled')).toBe(true)
    expect(getHomeButton(wrapper).prop('disabled')).toBe(true)
    expect(getRestartButton(wrapper).prop('disabled')).toBe(true)
  })

  it('DC, home, and restart buttons disabled if not connected', () => {
    const mockRobot: ViewableRobot = ({
      name: 'robot-name',
      connected: false,
      status: CONNECTABLE,
    }: any)

    const wrapper = mount(
      <Provider store={mockStore}>
        <MemoryRouter>
          <ControlsCard
            robot={mockRobot}
            checkCalibrationUrl="/check-deck"
            calibrateDeckUrl="/deck/calibrate"
          />
        </MemoryRouter>
      </Provider>
    )

    expect(getDeckCalButton(wrapper).prop('disabled')).toBe(true)
    expect(getRobotCalibrationCheckButton(wrapper).prop('disabled')).toBe(true)
    expect(getHomeButton(wrapper).prop('disabled')).toBe(true)
    expect(getRestartButton(wrapper).prop('disabled')).toBe(true)
  })

  it('DC, home, and restart buttons disabled if protocol running', () => {
    mockGetIsRunning.mockReturnValue(true)

    const wrapper = mount(
      <Provider store={mockStore}>
        <MemoryRouter>
          <ControlsCard
            robot={mockRobot}
            checkCalibrationUrl="/check-deck"
            calibrateDeckUrl="/deck/calibrate"
          />
        </MemoryRouter>
      </Provider>
    )

    expect(getDeckCalButton(wrapper).prop('disabled')).toBe(true)
    expect(getRobotCalibrationCheckButton(wrapper).prop('disabled')).toBe(true)
    expect(getHomeButton(wrapper).prop('disabled')).toBe(true)
    expect(getRestartButton(wrapper).prop('disabled')).toBe(true)
  })
})
