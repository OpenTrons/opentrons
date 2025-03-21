import { POST, request } from '../request'

import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type {
  Run,
  LegacyLabwareOffsetCreateData,
  RunTimeParameterValuesCreateData,
  RunTimeParameterFilesCreateData,
  LabwareOffsetCreateData,
} from './types'

export interface CreateRunData {
  protocolId?: string
  labwareOffsets?: LegacyLabwareOffsetCreateData[] | LabwareOffsetCreateData[]
  runTimeParameterValues?: RunTimeParameterValuesCreateData
  runTimeParameterFiles?: RunTimeParameterFilesCreateData
}

export function createRun(
  config: HostConfig,
  data: CreateRunData = {}
): ResponsePromise<Run> {
  return request<Run, { data: CreateRunData }>(POST, '/runs', { data }, config)
}
