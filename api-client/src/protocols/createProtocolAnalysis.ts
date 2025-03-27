import { POST, request } from '../request'

import type { ProtocolAnalysisSummary } from '@opentrons/shared-data'
import type { ResponsePromise } from '../request'
import type { HostConfig } from '../types'
import type {
  RunTimeParameterFilesCreateData,
  RunTimeParameterValuesCreateData,
} from '../runs'

export interface CreateProtocolAnalysisData {
  runTimeParameterValues: RunTimeParameterValuesCreateData
  runTimeParameterFiles: RunTimeParameterFilesCreateData
  forceReAnalyze: boolean
}

export interface ProtocolAnalysisSummaryResult {
  data: ProtocolAnalysisSummary[]
}

export function createProtocolAnalysis(
  config: HostConfig,
  protocolKey: string,
  runTimeParameterValues?: RunTimeParameterValuesCreateData,
  runTimeParameterFiles?: RunTimeParameterFilesCreateData,
  forceReAnalyze?: boolean
): ResponsePromise<ProtocolAnalysisSummaryResult> {
  const data = {
    runTimeParameterValues: runTimeParameterValues ?? {},
    runTimeParameterFiles: runTimeParameterFiles ?? {},
    forceReAnalyze: forceReAnalyze ?? false,
  }
  const response = request<
    ProtocolAnalysisSummaryResult,
    { data: CreateProtocolAnalysisData }
  >(POST, `/protocols/${protocolKey}/analyses`, { data }, config)
  return response
}
