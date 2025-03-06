import { POST, request } from '../request'

import type { ResponsePromise } from '../request'
import type {
  HostConfig,
  LabwareOffsetLocationSequenceComponent,
} from '../types'
import type { StoredLabwareOffset } from './types'

export interface SearchLabwareOffsetsData {
  /** Filters are ORed together. Within a single filter, criteria are ANDed together. */
  filters: Array<{
    id?: string
    definitionUri?: string
    locationSequence?: LabwareOffsetLocationSequenceComponent[]
    mostRecentOnly?: boolean
  }>
}

export interface SearchLabwareOffsetsResponse {
  data: StoredLabwareOffset[]
}

/**
 * Search labware offsets by specific criteria.
 *
 * @param data - The criteria by which to search.
 * @returns The matching labware offsets, oldest-to-newest.
 */
export function searchLabwareOffsets(
  config: HostConfig,
  data: SearchLabwareOffsetsData
): ResponsePromise<SearchLabwareOffsetsResponse> {
  return request<
    SearchLabwareOffsetsResponse,
    { data: SearchLabwareOffsetsData }
  >(POST, '/labwareOffsets', { data }, config)
}
