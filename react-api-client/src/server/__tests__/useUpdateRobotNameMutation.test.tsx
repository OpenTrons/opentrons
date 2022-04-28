import * as React from 'react'
import { when, resetAllWhenMocks } from 'jest-when'
import { QueryClient, QueryClientProvider } from 'react-query'
import { act, renderHook } from '@testing-library/react-hooks'
import { updateRobotName } from '@opentrons/api-client'
import { useHost } from '../../api'
import { useUpdateRobotNameMutation } from '..'

import type {
  HostConfig,
  Response,
  UpdatedRobotName,
} from '@opentrons/api-client'

jest.mock('@opentrons/api-client')
jest.mock('../../api/useHost')

const newRobotName = 'mockRobotName'
const mockUpdateRobotName = updateRobotName as jest.MockedFunction<
  typeof updateRobotName
>
const mockUseHost = useHost as jest.MockedFunction<typeof useHost>

const HOST_CONFIG: HostConfig = { hostname: 'localhost' }

const UPDATE_ROBOT_NAME_RESPONSE = {
  name: 'mockRobotName',
}

describe('useUpdatedRobotNameMutation, hook', () => {
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

  it('should return no data when calling updateRobotName if the request fails', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockUpdateRobotName)
      .calledWith(HOST_CONFIG, newRobotName)
      .mockRejectedValue('error')

    const { result, waitFor } = renderHook(() => useUpdateRobotNameMutation(), {
      wrapper,
    })

    expect(result.current.data).toBeUndefined()
    result.current.updateRobotName(newRobotName)
    await waitFor(() => {
      return result.current.status !== 'loading'
    })
  })

  it('should update a robot name when calling the useRobotName callback', async () => {
    when(mockUseHost).calledWith().mockReturnValue(HOST_CONFIG)
    when(mockUpdateRobotName)
      .calledWith(HOST_CONFIG, newRobotName)
      .mockResolvedValue({
        data: UPDATE_ROBOT_NAME_RESPONSE,
      } as Response<UpdatedRobotName>)

    const { result, waitFor } = renderHook(() => useUpdateRobotNameMutation(), {
      wrapper,
    })
    act(() => result.current.updateRobotName(newRobotName))

    await waitFor(() => result.current.data != null)

    expect(result.current.data).toEqual(UPDATE_ROBOT_NAME_RESPONSE)
  })
})
