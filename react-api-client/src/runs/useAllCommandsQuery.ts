import { useQuery } from 'react-query'
import { getCommands } from '@opentrons/api-client'
import { useHost } from '../api'
import type { UseQueryOptions, UseQueryResult } from 'react-query'
import type {
  GetRunCommandsParams,
  HostConfig,
  CommandsData,
} from '@opentrons/api-client'

const DEFAULT_PAGE_LENGTH = 30
export const DEFAULT_PARAMS: GetRunCommandsParams = {
  cursor: null,
  pageLength: DEFAULT_PAGE_LENGTH,
  includeFixitCommands: null,
}

export function useAllCommandsQuery<TError = Error>(
  runId: string | null,
  params?: GetRunCommandsParams | null,
  options: UseQueryOptions<CommandsData, TError> = {}
): UseQueryResult<CommandsData, TError> {
  const host = useHost()
  const nullCheckedParams = params ?? DEFAULT_PARAMS

  const allOptions: UseQueryOptions<CommandsData, TError> = {
    ...options,
    enabled: host !== null && runId != null && options.enabled !== false,
  }
  const { cursor, pageLength, includeFixitCommands } = nullCheckedParams
  const query = useQuery<CommandsData, TError>(
    [host, 'runs', runId, 'commands', cursor, pageLength, includeFixitCommands],
    () => {
      return getCommands(
        host as HostConfig,
        runId as string,
        nullCheckedParams
      ).then(response => response.data)
    },
    allOptions
  )

  return query
}
