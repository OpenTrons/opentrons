// tests for the useLights hooks
import { useLightsQuery } from '..'
import { useHost as mockUseHost } from '../../api'
import { getLights as mockGetLights } from '@opentrons/api-client'
import type { HostConfig, Response, Lights } from '@opentrons/api-client'
import { renderHook } from '@testing-library/react-hooks'
import { when } from 'jest-when'
import * as React from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const getLights = mockGetLights as jest.MockedFunction<typeof mockGetLights>
const useHost = mockUseHost as jest.MockedFunction<typeof mockUseHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const LIGHTS_RESPONSE: Lights = { on: true } as Lights

describe('useLights hook', () => {
  let wrapper: React.FunctionComponent<{}>

  beforeEach(() => {
    const queryClient = new QueryClient()
    const clientProvider: React.FunctionComponent<{}> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    wrapper = clientProvider
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('should return no data if no host', () => {
    when(useHost).calledWith().mockReturnValue(null)

    const { result } = renderHook(useLightsQuery, { wrapper })

    expect(result.current?.data).toBeUndefined()
  })

  it('should return no data if lights request fails', () => {
    when(useHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(getLights).calledWith(HOST_CONFIG).mockRejectedValue('oh no')

    const { result } = renderHook(useLightsQuery, { wrapper })

    expect(result.current?.data).toBeUndefined()
  })

  it('should return lights response data', async () => {
    when(useHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(getLights)
      .calledWith(HOST_CONFIG)
      .mockResolvedValue({ data: LIGHTS_RESPONSE } as Response<Lights>)

    const { result, waitFor } = renderHook(useLightsQuery, { wrapper })

    await waitFor(() => result.current?.data != null)

    expect(result.current?.data).toEqual(LIGHTS_RESPONSE)
  })
})
