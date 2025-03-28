import { useMutation, useQueryClient } from 'react-query'

import { createLabwareOffsets } from '@opentrons/api-client'

import { useHost } from '../api'

import type { UseMutationResult, UseMutateAsyncFunction } from 'react-query'
import type {
  HostConfig,
  CreateLabwareOffsetData,
  StoredLabwareOffset,
} from '@opentrons/api-client'

export type UseCreateLabwareOffsetsMutationResult = UseMutationResult<
  StoredLabwareOffset | StoredLabwareOffset[],
  unknown,
  CreateLabwareOffsetData
> & {
  createLabwareOffsets: UseMutateAsyncFunction<
    StoredLabwareOffset | StoredLabwareOffset[],
    unknown,
    CreateLabwareOffsetData
  >
}

export function useCreateLabwareOffsetsMutation(): UseCreateLabwareOffsetsMutationResult {
  const host = useHost()
  const queryClient = useQueryClient()

  const mutation = useMutation<
    StoredLabwareOffset | StoredLabwareOffset[],
    unknown,
    CreateLabwareOffsetData
  >(data =>
    createLabwareOffsets(host as HostConfig, data).then(response => {
      queryClient
        .invalidateQueries([host, 'labwareOffsets'])
        .catch((e: Error) => {
          console.error(`error invalidating labwareOffsets query: ${e.message}`)
        })
      return response.data.data
    })
  )

  return {
    ...mutation,
    createLabwareOffsets: mutation.mutateAsync,
  }
}
