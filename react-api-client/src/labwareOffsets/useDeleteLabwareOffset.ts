import { useMutation, useQueryClient } from 'react-query'

import { deleteLabwareOffset } from '@opentrons/api-client'

import { useHost } from '../api'

import type { UseMutationResult, UseMutateAsyncFunction } from 'react-query'
import type { HostConfig, StoredLabwareOffset } from '@opentrons/api-client'

export type UseDeleteLabwareOffsetMutationResult = UseMutationResult<
  StoredLabwareOffset,
  unknown,
  string
> & {
  deleteLabwareOffset: UseMutateAsyncFunction<
    StoredLabwareOffset,
    unknown,
    string
  >
}

// Delete a single labware offset using a given id.
export function useDeleteLabwareOffsetMutation(): UseDeleteLabwareOffsetMutationResult {
  const host = useHost()
  const queryClient = useQueryClient()

  const mutation = useMutation<StoredLabwareOffset, unknown, string>(
    (id: string) =>
      deleteLabwareOffset(host as HostConfig, id).then(response => {
        queryClient
          .invalidateQueries([host, 'labwareOffsets'])
          .catch((e: Error) => {
            console.error(
              `error invalidating labwareOffsets query: ${e.message}`
            )
          })
        return response.data.data
      })
  )

  return {
    ...mutation,
    deleteLabwareOffset: mutation.mutateAsync,
  }
}
