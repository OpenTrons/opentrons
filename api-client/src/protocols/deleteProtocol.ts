import { DELETE, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type { EmptyResponse } from './types'

export function deleteProtocol(
  config: HostConfig,
  protocolId: string
): ResponsePromise<EmptyResponse> {
  return request<EmptyResponse>(
    DELETE,
    `/protocols/${protocolId}`,
    null,
    config
  )
}
