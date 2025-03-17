import { DELETE, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type { StoredLabwareOffset } from './types'

/**
 * Delete a single labware offset by ID.
 *
 * @param id - The ID of the labware offset to delete.
 */
export function deleteLabwareOffset(
  config: HostConfig,
  id: string
): ResponsePromise<{ data: StoredLabwareOffset }> {
  return request<{ data: StoredLabwareOffset }>(
    DELETE,
    `/labwareOffsets/${id}`,
    null,
    config
  )
}
