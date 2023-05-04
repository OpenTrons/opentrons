import { useHost } from '../api'
import {
  HostConfig,
  Run,
  createRun,
  CreateRunData,
} from '@opentrons/api-client'
import type { AxiosError } from 'axios'
import {
  UseMutationResult,
  useMutation,
  UseMutateFunction,
  UseMutationOptions,
} from 'react-query'

export type UseCreateRunMutationResult = UseMutationResult<
  Run,
  AxiosError,
  CreateRunData
> & {
  createRun: UseMutateFunction<Run, AxiosError, CreateRunData>
}

export type UseCreateRunMutationOptions = UseMutationOptions<
  Run,
  AxiosError,
  CreateRunData
>

export function useCreateRunMutation(
  options: UseCreateRunMutationOptions = {},
  hostOverride?: HostConfig | null
): UseCreateRunMutationResult {
  const contextHost = useHost()
  const host = hostOverride ?? contextHost
  const mutation = useMutation<Run, AxiosError, CreateRunData>(
    [host, 'runs'],
    createRunData =>
      createRun(host as HostConfig, createRunData)
        .then(response => response.data)
        .catch(e => {
          throw e
        }),
    options
  )
  return {
    ...mutation,
    createRun: mutation.mutate,
  }
}
