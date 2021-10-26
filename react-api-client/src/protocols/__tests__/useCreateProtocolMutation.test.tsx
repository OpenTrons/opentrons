import * as React from 'react'
import { when, resetAllWhenMocks } from 'jest-when'
import { QueryClient, QueryClientProvider } from 'react-query'
import { act, renderHook } from '@testing-library/react-hooks'
import { createProtocol } from '@opentrons/api-client'
import { useHost } from '../../api'
import { useCreateProtocolMutation } from '..'
import type { HostConfig, Response, Protocol } from '@opentrons/api-client'
import { testProtocol } from '../../../../protocol-designer/fixtures/protocol/5/doItAllV5.json'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const mockCreateProtocol = createProtocol as jest.MockedFunction<
  typeof createProtocol
>
const mockUseHost = useHost as jest.MockedFunction<typeof useHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const PROTOCOL_RESPONSE = {
  data: {
    id: '1',
    createdAt: 'now',
    protocolType: 'json',
    metadata: {},
    analyses: {},
  },
} as Protocol

describe('useCreateProtocolMutation hook', () => {
  let wrapper: React.FunctionComponent<{}>
  const createProtocolData = [testProtocol]

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

  it('should return no data when calling createProtocol if the request fails', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockCreateProtocol)
      .calledWith(HOST_CONFIG, createProtocolData)
      .mockRejectedValue('oh no')

    const { result, waitFor } = renderHook(
      () => useCreateProtocolMutation(createProtocolData),
      {
        wrapper,
      }
    )

    expect(result.current.data).toBeUndefined()
    result.current.createProtocol()
    await waitFor(() => {
      console.log(result.current.status)
      return result.current.status !== 'loading'
    })
    expect(result.current.data).toBeUndefined()
  })

  it('should create a protocol when calling the createProtocol callback', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockCreateProtocol)
      .calledWith(HOST_CONFIG, createProtocolData)
      .mockResolvedValue({ data: PROTOCOL_RESPONSE } as Response<Protocol>)

    const { result, waitFor } = renderHook(
      () => useCreateProtocolMutation(createProtocolData),
      {
        wrapper,
      }
    )
    act(() => result.current.createProtocol())

    await waitFor(() => result.current.data != null)

    expect(result.current.data).toEqual(PROTOCOL_RESPONSE)
  })
})
