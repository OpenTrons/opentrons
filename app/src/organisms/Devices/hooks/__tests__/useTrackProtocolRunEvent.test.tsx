import * as React from 'react'
import { createStore, Store } from 'redux'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from 'react-query'
import { resetAllWhenMocks, when } from 'jest-when'
import { waitFor, renderHook } from '@testing-library/react'

import { useTrackProtocolRunEvent } from '../useTrackProtocolRunEvent'
import { useProtocolRunAnalyticsData } from '../useProtocolRunAnalyticsData'
import {
  useTrackEvent,
  ANALYTICS_PROTOCOL_RUN_START,
} from '../../../../redux/analytics'
import { mockConnectableRobot } from '../../../../redux/discovery/__fixtures__'
import { useRobot } from '../useRobot'

jest.mock('../../hooks')
jest.mock('../useProtocolRunAnalyticsData')
jest.mock('../../../../redux/discovery')
jest.mock('../../../../redux/pipettes')
jest.mock('../../../../redux/analytics')
jest.mock('../../../../redux/robot-settings')
jest.mock('../useRobot')

const mockUseTrackEvent = useTrackEvent as jest.MockedFunction<
  typeof useTrackEvent
>
const mockUseRobot = useRobot as jest.MockedFunction<typeof useRobot>
const mockUseProtocolRunAnalyticsData = useProtocolRunAnalyticsData as jest.MockedFunction<
  typeof useProtocolRunAnalyticsData
>

const RUN_ID = 'runId'
const ROBOT_NAME = 'otie'
const PROTOCOL_PROPERTIES = { protocolType: 'python' }

let mockTrackEvent: jest.Mock
let mockGetProtocolRunAnalyticsData: jest.Mock
let wrapper: React.FunctionComponent<{ children: React.ReactNode }>
let store: Store<any> = createStore(jest.fn(), {})

describe('useTrackProtocolRunEvent hook', () => {
  beforeEach(() => {
    store = createStore(jest.fn(), {})
    store.dispatch = jest.fn()
    const queryClient = new QueryClient()
    wrapper = ({ children }) => (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </Provider>
    )
    mockTrackEvent = jest.fn()
    mockGetProtocolRunAnalyticsData = jest.fn(
      () =>
        new Promise(resolve =>
          resolve({ protocolRunAnalyticsData: PROTOCOL_PROPERTIES })
        )
    )
    mockUseTrackEvent.mockReturnValue(mockTrackEvent)
    mockUseRobot.mockReturnValue(mockConnectableRobot)
    when(mockUseProtocolRunAnalyticsData)
      .calledWith(RUN_ID, mockConnectableRobot)
      .mockReturnValue({
        getProtocolRunAnalyticsData: mockGetProtocolRunAnalyticsData,
      })
  })

  afterEach(() => {
    resetAllWhenMocks()
    jest.resetAllMocks()
  })

  it('returns trackProtocolRunEvent function', () => {
    const { result } = renderHook(
      () => useTrackProtocolRunEvent(RUN_ID, ROBOT_NAME),
      {
        wrapper,
      }
    )
    expect(typeof result.current.trackProtocolRunEvent).toBe('function')
  })

  it('trackProtocolRunEvent invokes trackEvent with correct props', async () => {
    const { result } = renderHook(
      () => useTrackProtocolRunEvent(RUN_ID, ROBOT_NAME),
      {
        wrapper,
      }
    )
    await waitFor(() =>
      result.current.trackProtocolRunEvent({
        name: ANALYTICS_PROTOCOL_RUN_START,
        properties: {},
      })
    )
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_PROTOCOL_RUN_START,
      properties: PROTOCOL_PROPERTIES,
    })
  })

  it('trackProtocolRunEvent calls trackEvent without props when error is thrown in getProtocolRunAnalyticsData', async () => {
    when(mockUseProtocolRunAnalyticsData)
      .calledWith('errorId', mockConnectableRobot)
      .mockReturnValue({
        getProtocolRunAnalyticsData: () =>
          new Promise(() => {
            throw new Error('error')
          }),
      })
    const { result } = renderHook(
      () => useTrackProtocolRunEvent('errorId', ROBOT_NAME),
      {
        wrapper,
      }
    )
    await waitFor(() =>
      result.current.trackProtocolRunEvent({
        name: ANALYTICS_PROTOCOL_RUN_START,
        properties: {},
      })
    )
    expect(mockTrackEvent).toHaveBeenCalledWith({
      name: ANALYTICS_PROTOCOL_RUN_START,
      properties: {},
    })
  })
})
