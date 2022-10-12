import * as React from 'react'
import { when } from 'jest-when'
import { renderHook } from '@testing-library/react-hooks'
import { useAllRunsQuery, useRunQuery } from '@opentrons/react-api-client'
import { useHistoricRunDetails } from '../useHistoricRunDetails'
import { mockRunningRun } from '../../../RunTimeControl/__fixtures__'
import { mockSuccessQueryResults } from '../../../../__fixtures__'

import type { RunData } from '@opentrons/api-client'

jest.mock('@opentrons/react-api-client')

const mockUseAllRunsQuery = useAllRunsQuery as jest.MockedFunction<
  typeof useAllRunsQuery
>
const mockUseRunQuery = useRunQuery as jest.MockedFunction<typeof useRunQuery>

const MOCK_RUN_LATER: RunData = {
  ...mockRunningRun,
  id: 'run_one',
  createdAt: '2022-05-02T14:34:48.843177',
  current: false,
  status: 'succeeded',
  protocolId: 'fakeProtocolId',
}
const MOCK_RUN_EARLIER: RunData = {
  ...mockRunningRun,
  id: 'run_zero',
  createdAt: '2022-05-01T14:34:48.843177',
  current: false,
  status: 'succeeded',
  protocolId: 'fakeProtocolId',
}

describe('useHistoricRunDetails', () => {
  when(mockUseAllRunsQuery)
    .calledWith()
    .mockReturnValue(
      mockSuccessQueryResults({
        data: [MOCK_RUN_LATER, MOCK_RUN_EARLIER],
        links: {},
      })
    )
  when(mockUseRunQuery)
    .calledWith(MOCK_RUN_LATER.id)
    .mockReturnValue(
      mockSuccessQueryResults({
        data: MOCK_RUN_LATER,
      })
    )
  when(mockUseRunQuery)
    .calledWith(MOCK_RUN_EARLIER.id)
    .mockReturnValue(
      mockSuccessQueryResults({
        data: MOCK_RUN_EARLIER,
      })
    )

  it('returns historical run details with newest first', async () => {
    const wrapper: React.FunctionComponent<{}> = ({ children }) => (
      <div>{children}</div>
    )
    const { result, waitFor } = renderHook(useHistoricRunDetails, { wrapper })
    await waitFor(() => result.current != null)
    expect(result.current).toEqual([MOCK_RUN_LATER, MOCK_RUN_EARLIER])
  })
})
