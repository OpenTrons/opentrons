import * as React from 'react'
import { when, resetAllWhenMocks } from 'jest-when'
import { QueryClient, QueryClientProvider } from 'react-query'
import { renderHook } from '@testing-library/react-hooks'
import { FetchPipettesResponseBody, getPipettes } from '@opentrons/api-client'
import { useHost } from '../../api'
import { useAttachedPipettesQuery } from '..'

import type { HostConfig, Response } from '@opentrons/api-client'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const mockGetPipettes = getPipettes as jest.MockedFunction<typeof getPipettes>
const mockUseHost = useHost as jest.MockedFunction<typeof useHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const PIPETTES_RESPONSE = {
  left: {
    model: 'p10_single_v1',
    name: 'p10_single',
    tip_length: 0.0,
    mount_axis: 'z',
    plunger_axis: 'b',
    id: '123',
  },
  right: {
    model: 'p300_single_v1',
    name: 'p300_single',
    tip_length: 0.0,
    mount_axis: 'a',
    plunger_axis: 'c',
    id: '321',
  },
} as FetchPipettesResponseBody

describe('useAttachedPipettesQuery hook', () => {
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

    const { result } = renderHook(useAttachedPipettesQuery, { wrapper })

    expect(result.current.data).toBeUndefined()
  })

  it('should return no data if the getPipettes request fails', () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetPipettes).calledWith(HOST_CONFIG).mockRejectedValue('oh no')

    const { result } = renderHook(useAttachedPipettesQuery, { wrapper })
    expect(result.current.data).toBeUndefined()
  })

  it('should return all current protocols', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockGetPipettes)
      .calledWith(HOST_CONFIG)
      .mockResolvedValue({
        data: PIPETTES_RESPONSE,
      } as Response<FetchPipettesResponseBody>)

    const { result, waitFor } = renderHook(useAttachedPipettesQuery, {
      wrapper,
    })

    await waitFor(() => result.current.data != null)

    expect(result.current.data).toEqual(PIPETTES_RESPONSE)
  })
})
