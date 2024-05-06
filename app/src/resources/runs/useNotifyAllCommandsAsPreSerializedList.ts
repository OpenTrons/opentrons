import { useAllCommandsAsPreSerializedList } from '@opentrons/react-api-client'

import { useNotifyService } from '../useNotifyService'

import type { UseQueryResult } from 'react-query'
import type { AxiosError } from 'axios'
import type { CommandsData, GetCommandsParams } from '@opentrons/api-client'
import type { QueryOptionsWithPolling } from '../useNotifyService'

export function useNotifyAllCommandsAsPreSerializedList(
  runId: string | null,
  params?: GetCommandsParams | null,
  options: QueryOptionsWithPolling<CommandsData, AxiosError> = {}
): UseQueryResult<CommandsData, AxiosError> {
  const { notifyOnSettled, isNotifyEnabled } = useNotifyService({
    topic: `robot-server/runs/pre_serialized_commands/${runId}`,
    options,
  })

  const httpResponse = useAllCommandsAsPreSerializedList(runId, params, {
    ...options,
    enabled: options?.enabled !== false && isNotifyEnabled,
    onSettled: notifyOnSettled,
  })

  return httpResponse
}
