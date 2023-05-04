import { useCurrentRunId } from './useCurrentRunId'
import { useRunCommands } from './useRunCommands'
import type {
  CommandsData,
  RunCommandSummary,
  GetCommandsParams,
} from '@opentrons/api-client'
import type { UseQueryOptions } from 'react-query'

export function useCurrentRunCommands(
  params?: GetCommandsParams,
  options?: UseQueryOptions<CommandsData>
): RunCommandSummary[] | null {
  const currentRunId = useCurrentRunId()

  return useRunCommands(currentRunId, params, options)
}
