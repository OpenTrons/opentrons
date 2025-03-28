import { GET, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type { StoredLabwareOffset, MultiBodyMeta } from './types'

export interface LabwareOffsetsSearchParams {
  cursor?: number
  pageLength?: number | 'unlimited'
}

export interface LabwareOffsetsResponse {
  data: StoredLabwareOffset[]
  meta: MultiBodyMeta
}

/**
 * Get all the labware offsets currently stored on the robot.
 * Results are returned in order from oldest to newest.
 *
 * @param params - Optional filter parameters.
 */
export function getLabwareOffsets(
  config: HostConfig,
  params: LabwareOffsetsSearchParams = {}
): ResponsePromise<LabwareOffsetsResponse> {
  return request<LabwareOffsetsResponse>(
    GET,
    '/labwareOffsets',
    null,
    config,
    params
  )
}
