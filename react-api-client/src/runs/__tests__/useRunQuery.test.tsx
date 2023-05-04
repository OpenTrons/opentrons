import { useRunQuery } from '..'
import { useHost } from '../../api'
import { getRun } from '@opentrons/api-client'
import type { HostConfig, Response, Run } from '@opentrons/api-client'
import { renderHook } from '@testing-library/react-hooks'
import { when, resetAllWhenMocks } from 'jest-when'
import * as React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const mockGetRun = getRun as jest.MockedFunction<typeof getRun>
const mockUseHost = useHost as jest.MockedFunction<typeof useHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const RUN_ID = '1'
const RUN_RESPONSE = { data: { id: RUN_ID } } as Run

describe('useRunQuery hook', () => {
  let wrapper: React.FunctionComponent<{}>

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

  it('should return no data if no host', () => {
    when(mockUseHost).calledWith().mockReturnValue(null)

    const { result } = renderHook(() => useRunQuery(RUN_ID), {
      wrapper,
    })

    expect(result.current.data).toBeUndefined()
  })

  it('should return no data if the get runs request fails', () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetRun).calledWith(HOST_CONFIG, RUN_ID).mockRejectedValue('oh no')

    const { result } = renderHook(() => useRunQuery(RUN_ID), {
      wrapper,
    })
    expect(result.current.data).toBeUndefined()
  })

  it('should return a run', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetRun)
      .calledWith(HOST_CONFIG, RUN_ID)
      .mockResolvedValue({ data: RUN_RESPONSE } as Response<Run>)

    const { result, waitFor } = renderHook(() => useRunQuery(RUN_ID), {
      wrapper,
    })

    await waitFor(() => result.current.data != null)

    expect(result.current.data).toEqual(RUN_RESPONSE)
  })
})
