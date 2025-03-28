import { POST, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type {
  LabwareOffset,
  LegacyLabwareOffsetCreateData,
  LabwareOffsetCreateData,
} from './types'

export function addLabwareOffsetToRun(
  config: HostConfig,
  runId: string,
  data: LegacyLabwareOffsetCreateData | LabwareOffsetCreateData
): ResponsePromise<LabwareOffset>
export function addLabwareOffsetToRun(
  config: HostConfig,
  runId: string,
  data: LegacyLabwareOffsetCreateData[] | LabwareOffsetCreateData[]
): ResponsePromise<LabwareOffset[]>
export function addLabwareOffsetToRun(
  config: HostConfig,
  runId: string,
  data:
    | LegacyLabwareOffsetCreateData
    | LegacyLabwareOffsetCreateData[]
    | LabwareOffsetCreateData
    | LabwareOffsetCreateData[]
): ResponsePromise<LabwareOffset | LabwareOffset[]> {
  return request<
    LabwareOffset | LabwareOffset[],
    {
      data:
        | LegacyLabwareOffsetCreateData
        | LegacyLabwareOffsetCreateData[]
        | LabwareOffsetCreateData
        | LabwareOffsetCreateData[]
    }
  >(POST, `/runs/${runId}/labware_offsets`, { data }, config)
}
