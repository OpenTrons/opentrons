import * as React from 'react'
import { when, resetAllWhenMocks } from 'jest-when'
import { QueryClient, QueryClientProvider } from 'react-query'
import { act, renderHook } from '@testing-library/react-hooks'
import { createRunAction, RUN_ACTION_TYPE_PLAY } from '@opentrons/api-client'
import { useHost } from '../../api'
import { usePlayRunMutation } from '..'

import { RUN_ID_1, mockPlayRunAction } from '../__fixtures__'

import type { HostConfig, Response, RunAction } from '@opentrons/api-client'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const mockCreateRunAction = createRunAction as jest.MockedFunction<
  typeof createRunAction
>
const mockUseHost = useHost as jest.MockedFunction<typeof useHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }

describe('usePlayRunMutation hook', () => {
  let wrapper: React.FunctionComponent<{}>
  const createPlayRunActionData = { actionType: RUN_ACTION_TYPE_PLAY }

  beforeEach(() => {
    const queryClient = new QueryClient()
    const clientProvider: React.FunctionComponent<{}> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    wrapper = clientProvider
  })
  afterEach(() => {
    resetAllWhenMocks()
  })

  it('should return no data when calling playRun if the request fails', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockCreateRunAction)
      .calledWith(HOST_CONFIG, RUN_ID_1, createPlayRunActionData)
      .mockRejectedValue('oh no')

    const { result, waitFor } = renderHook(() => usePlayRunMutation(RUN_ID_1), {
      wrapper,
    })

    expect(result.current.data).toBeUndefined()
    result.current.playRun()
    await waitFor(() => {
      return result.current.status !== 'loading'
    })
    expect(result.current.data).toBeUndefined()
  })

  it('should create a play run action when calling the playRun callback', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockCreateRunAction)
      .calledWith(HOST_CONFIG, RUN_ID_1, createPlayRunActionData)
      .mockResolvedValue({ data: mockPlayRunAction } as Response<RunAction>)

    const { result, waitFor } = renderHook(() => usePlayRunMutation(RUN_ID_1), {
      wrapper,
    })
    act(() => result.current.playRun())

    await waitFor(() => result.current.data != null)

    expect(result.current.data).toEqual(mockPlayRunAction)
  })
})
