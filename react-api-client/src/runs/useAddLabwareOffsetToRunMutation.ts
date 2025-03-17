import { useMutation, useQueryClient } from 'react-query'
import { addLabwareOffsetToRun } from '@opentrons/api-client'
import { useHost } from '../api'
import type {
  HostConfig,
  LegacyLabwareOffsetCreateData,
  LabwareOffset,
} from '@opentrons/api-client'
import type { UseMutationResult, UseMutateAsyncFunction } from 'react-query'

interface AddLabwareOffsetToRunParams {
  runId: string
  data: LegacyLabwareOffsetCreateData
}

export type UseAddLabwareOffsetToRun = UseMutationResult<
  LabwareOffset,
  unknown,
  AddLabwareOffsetToRunParams
> & {
  createLabwareOffset: UseMutateAsyncFunction<
    LabwareOffset,
    unknown,
    AddLabwareOffsetToRunParams
  >
}

export function useAddLabwareOffsetToRunMutation(): UseAddLabwareOffsetToRun {
  const host = useHost()
  const queryClient = useQueryClient()

  const mutation = useMutation<
    LabwareOffset,
    unknown,
    AddLabwareOffsetToRunParams
  >(({ runId, data }) =>
    addLabwareOffsetToRun(host as HostConfig, runId, data)
      .then(response => {
        queryClient.invalidateQueries([host, 'runs']).catch((e: Error) => {
          console.error(`error invalidating runs query: ${e.message}`)
        })
        return response.data
      })
      .catch((e: Error) => {
        console.error(`error creating labware offsets: ${e.message}`)
        throw e
      })
  )

  return {
    ...mutation,
    createLabwareOffset: mutation.mutateAsync,
  }
}
