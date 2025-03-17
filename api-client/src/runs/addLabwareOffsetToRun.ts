import { POST, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type { LabwareOffset, LegacyLabwareOffsetCreateData } from './types'

export function addLabwareOffsetToRun(
  config: HostConfig,
  runId: string,
  data: LegacyLabwareOffsetCreateData
): ResponsePromise<LabwareOffset>
export function addLabwareOffsetToRun(
  config: HostConfig,
  runId: string,
  data: LegacyLabwareOffsetCreateData[]
): ResponsePromise<LabwareOffset[]>
export function addLabwareOffsetToRun(
  config: HostConfig,
  runId: string,
  data: LegacyLabwareOffsetCreateData | LegacyLabwareOffsetCreateData[]
): ResponsePromise<LabwareOffset | LabwareOffset[]> {
  return request<
    LabwareOffset | LabwareOffset[],
    { data: LegacyLabwareOffsetCreateData | LegacyLabwareOffsetCreateData[] }
  >(POST, `/runs/${runId}/labware_offsets`, { data }, config)
}
