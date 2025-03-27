import { createProtocolAnalysis } from '@opentrons/api-client'
import { useMutation, useQueryClient } from 'react-query'
import { useHost } from '../api'
import type {
  ErrorResponse,
  HostConfig,
  RunTimeParameterFilesCreateData,
  RunTimeParameterValuesCreateData,
  ProtocolAnalysisSummaryResult,
} from '@opentrons/api-client'
import type { AxiosError } from 'axios'
import type {
  UseMutationResult,
  UseMutationOptions,
  UseMutateFunction,
} from 'react-query'

export interface CreateProtocolAnalysisVariables {
  protocolKey: string
  runTimeParameterValues?: RunTimeParameterValuesCreateData
  runTimeParameterFiles?: RunTimeParameterFilesCreateData
  forceReAnalyze?: boolean
}
export type UseCreateProtocolMutationResult = UseMutationResult<
  ProtocolAnalysisSummaryResult,
  AxiosError<ErrorResponse>,
  CreateProtocolAnalysisVariables
> & {
  createProtocolAnalysis: UseMutateFunction<
    ProtocolAnalysisSummaryResult,
    AxiosError<ErrorResponse>,
    CreateProtocolAnalysisVariables
  >
}

export type UseCreateProtocolAnalysisMutationOptions = UseMutationOptions<
  ProtocolAnalysisSummaryResult,
  AxiosError<ErrorResponse>,
  CreateProtocolAnalysisVariables
>

export function useCreateProtocolAnalysisMutation(
  protocolId: string | null,
  hostOverride?: HostConfig | null,
  options: UseCreateProtocolAnalysisMutationOptions | undefined = {}
): UseCreateProtocolMutationResult {
  const contextHost = useHost()
  const host =
    hostOverride != null ? { ...contextHost, ...hostOverride } : contextHost
  const queryClient = useQueryClient()

  const mutation = useMutation<
    ProtocolAnalysisSummaryResult,
    AxiosError<ErrorResponse>,
    CreateProtocolAnalysisVariables
  >(
    [host, 'protocols', protocolId, 'analyses'],
    ({
      protocolKey,
      runTimeParameterValues,
      runTimeParameterFiles,
      forceReAnalyze,
    }) =>
      createProtocolAnalysis(
        host as HostConfig,
        protocolKey,
        runTimeParameterValues,
        runTimeParameterFiles,
        forceReAnalyze
      )
        .then(response => {
          queryClient
            .invalidateQueries([host, 'protocols'])
            .catch((e: Error) => {
              throw e
            })
          return response.data
        })
        .catch((e: Error) => {
          throw e
        }),
    options
  )
  return {
    ...mutation,
    createProtocolAnalysis: mutation.mutate,
  }
}
