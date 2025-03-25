import type * as React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from 'react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createProtocolAnalysis } from '@opentrons/api-client'
import { useHost } from '../../api'
import { useCreateProtocolAnalysisMutation } from '..'
import type {
  HostConfig,
  Response,
  ProtocolAnalysisSummaryResult,
} from '@opentrons/api-client'
import type { ProtocolAnalysisSummary } from '@opentrons/shared-data'

vi.mock('@opentrons/api-client')
vi.mock('../../api/useHost')

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }
const ANALYSIS_SUMMARY_RESPONSE = [
  { id: 'fakeAnalysis1', status: 'completed' },
  { id: 'fakeAnalysis2', status: 'pending' },
] as ProtocolAnalysisSummary[]

describe('useCreateProtocolAnalysisMutation hook', () => {
  let wrapper: React.FunctionComponent<{ children: React.ReactNode }>

  beforeEach(() => {
    const queryClient = new QueryClient()
    const clientProvider: React.FunctionComponent<{
      children: React.ReactNode
    }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
    wrapper = clientProvider
  })

  it('should return no data when calling createProtocolAnalysis if the request fails', async () => {
    vi.mocked(useHost).mockReturnValue(HOST_CONFIG)
    vi.mocked(createProtocolAnalysis).mockRejectedValue('oh no')

    const { result } = renderHook(
      () => useCreateProtocolAnalysisMutation('fake-protocol-key'),
      {
        wrapper,
      }
    )

    expect(result.current.data).toBeUndefined()
    result.current.createProtocolAnalysis({
      protocolKey: 'fake-protocol-key',
      runTimeParameterValues: {},
    })
    await waitFor(() => {
      expect(result.current.data).toBeUndefined()
    })
  })

  it('should create an array of ProtocolAnalysisSummaries when calling the createProtocolAnalysis callback', async () => {
    vi.mocked(useHost).mockReturnValue(HOST_CONFIG)
    vi.mocked(createProtocolAnalysis).mockResolvedValue({
      data: { data: ANALYSIS_SUMMARY_RESPONSE },
    } as Response<ProtocolAnalysisSummaryResult>)

    const { result } = renderHook(
      () => useCreateProtocolAnalysisMutation('fake-protocol-key'),
      {
        wrapper,
      }
    )
    act(() =>
      result.current.createProtocolAnalysis({
        protocolKey: 'fake-protocol-key',
        runTimeParameterValues: {},
      })
    )

    await waitFor(() => {
      expect(result.current.data?.data).toEqual(ANALYSIS_SUMMARY_RESPONSE)
    })
  })
})
