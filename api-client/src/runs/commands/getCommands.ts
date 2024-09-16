import { GET, request } from '../../request'

import type { ResponsePromise } from '../../request'
import type { HostConfig } from '../../types'
import type { CommandsData } from '..'
import type { GetRunCommandsParamsRequest } from './types'

export function getCommands(
  config: HostConfig,
  runId: string,
  params: GetRunCommandsParamsRequest
): ResponsePromise<CommandsData> {
  return request<CommandsData>(
    GET,
    `/runs/${runId}/commands`,
    null,
    config,
    params
  )
}
