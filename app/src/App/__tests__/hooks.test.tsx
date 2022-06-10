import * as React from 'react'
import { renderHook } from '@testing-library/react-hooks'
import { createStore } from 'redux'
import { I18nextProvider } from 'react-i18next'
import { Provider } from 'react-redux'

import { i18n } from '../../i18n'
import {
  getNavbarLocations,
  getConnectedRobotPipettesMatch,
  getConnectedRobotPipettesCalibrated,
  getDeckCalibrationOk,
} from '../../redux/nav'
import { checkShellUpdate } from '../../redux/shell'
import { getConnectedRobot } from '../../redux/discovery'
import {
  useNavLocations,
  useRunLocation,
  useSoftwareUpdatePoll,
} from '../hooks'
import { useIsProtocolRunLoaded } from '../../organisms/ProtocolUpload/hooks'

import type { Store } from 'redux'
import type { State } from '../../redux/types'

jest.mock('../../redux/nav')
jest.mock('../../redux/config')
jest.mock('../../redux/discovery')
jest.mock('../../organisms/ProtocolUpload/hooks')
jest.mock('../../organisms/Labware/helpers/getAllDefs')

const mockGetConnectedRobot = getConnectedRobot as jest.MockedFunction<
  typeof getConnectedRobot
>
const mockGetConnectedRobotPipettesMatch = getConnectedRobotPipettesMatch as jest.MockedFunction<
  typeof getConnectedRobotPipettesMatch
>
const mockGetConnectedRobotPipettesCalibrated = getConnectedRobotPipettesCalibrated as jest.MockedFunction<
  typeof getConnectedRobotPipettesCalibrated
>
const mockGetDeckCalibrationOk = getDeckCalibrationOk as jest.MockedFunction<
  typeof getDeckCalibrationOk
>
const mockGetNavbarLocations = getNavbarLocations as jest.MockedFunction<
  typeof getNavbarLocations
>
const mockUseIsCurrentRunLoaded = useIsProtocolRunLoaded as jest.MockedFunction<
  typeof useIsProtocolRunLoaded
>

describe('useRunLocation', () => {
  let wrapper: React.FunctionComponent<{}>
  let store: Store<State>

  describe('run disabled reason', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      store = createStore(jest.fn(), {})
      store.dispatch = jest.fn()
      wrapper = ({ children }) => (
        <I18nextProvider i18n={i18n}>
          <Provider store={store}>{children}</Provider>
        </I18nextProvider>
      )
      mockGetConnectedRobot.mockReturnValue({} as any)
      mockGetConnectedRobotPipettesMatch.mockReturnValue(true)
      mockGetConnectedRobotPipettesCalibrated.mockReturnValue(true)
      mockGetDeckCalibrationOk.mockReturnValue(true)
      mockUseIsCurrentRunLoaded.mockReturnValue(true)
    })
    afterEach(() => {
      jest.clearAllTimers()
      jest.useRealTimers()
      jest.resetAllMocks()
    })
    it('should tell user to connect to a robot', () => {
      mockGetConnectedRobot.mockReturnValue(null)
      const { result } = renderHook(useRunLocation, { wrapper })
      const { disabledReason } = result.current
      expect(disabledReason).toBe('Please connect to a robot to proceed')
    })
    it('should tell user to load a protocol', () => {
      mockUseIsCurrentRunLoaded.mockReturnValue(false)
      const { result } = renderHook(useRunLocation, { wrapper })
      const { disabledReason } = result.current
      expect(disabledReason).toBe('Please load a protocol to proceed')
    })
    it('should tell user that the attached pipettes do not match', () => {
      mockGetConnectedRobotPipettesMatch.mockReturnValue(false)
      const { result } = renderHook(useRunLocation, { wrapper })
      const { disabledReason } = result.current
      expect(disabledReason).toBe(
        'Attached pipettes do not match pipettes specified in loaded protocol'
      )
    })
    it('should tell user to calibrate pipettes', () => {
      mockGetConnectedRobotPipettesCalibrated.mockReturnValue(false)
      const { result } = renderHook(useRunLocation, { wrapper })
      const { disabledReason } = result.current
      expect(disabledReason).toBe(
        'Please calibrate all pipettes specified in loaded protocol to proceed'
      )
    })
    it('should tell user to calibrate the deck', () => {
      mockGetDeckCalibrationOk.mockReturnValue(false)
      const { result } = renderHook(useRunLocation, { wrapper })
      const { disabledReason } = result.current
      expect(disabledReason).toBe('Calibrate your deck to proceed')
    })
  })

  describe('useNavLocations', () => {
    it('should return the 4 nav items', () => {
      mockGetConnectedRobot.mockReturnValue({} as any)
      mockGetConnectedRobotPipettesMatch.mockReturnValue(true)
      mockGetConnectedRobotPipettesCalibrated.mockReturnValue(true)
      mockGetDeckCalibrationOk.mockReturnValue(true)
      mockGetNavbarLocations.mockReturnValue([0, 1, 2, 3, 4] as any)
      mockUseIsCurrentRunLoaded.mockReturnValue(true)
      const { result } = renderHook(useNavLocations, { wrapper })
      expect(result.current.length).toBe(4)
    })
  })

  describe('useSoftwareUpdatePoll', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      store = createStore(jest.fn(), {})
      store.dispatch = jest.fn()
      wrapper = ({ children }) => (
        <I18nextProvider i18n={i18n}>
          <Provider store={store}>{children}</Provider>
        </I18nextProvider>
      )
    })
    afterEach(() => {
      jest.clearAllTimers()
      jest.useRealTimers()
      jest.resetAllMocks()
    })
    it('checks for update availability on an interval', () => {
      renderHook(useSoftwareUpdatePoll, { wrapper })

      expect(store.dispatch).not.toHaveBeenCalledWith(checkShellUpdate())
      jest.advanceTimersByTime(60001)
      expect(store.dispatch).toHaveBeenCalledTimes(1)
      expect(store.dispatch).toHaveBeenCalledWith(checkShellUpdate())
    })
  })
})
