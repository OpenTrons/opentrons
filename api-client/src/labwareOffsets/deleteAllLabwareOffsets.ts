import { DELETE, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'

/**
 * Delete all labware offsets stored on the robot.
 */
export function deleteAllLabwareOffsets(
  config: HostConfig
): ResponsePromise<{ data: null }> {
  return request<{ data: null }>(DELETE, '/labwareOffsets', null, config)
}
