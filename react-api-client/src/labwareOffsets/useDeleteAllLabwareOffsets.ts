import { useMutation, useQueryClient } from 'react-query'

import { deleteAllLabwareOffsets } from '@opentrons/api-client'

import { useHost } from '../api'

import type { UseMutationResult, UseMutateFunction } from 'react-query'
import type { HostConfig } from '@opentrons/api-client'

export type UseDeleteAllLabwareOffsetsMutationResult = UseMutationResult<
  null,
  unknown,
  void
> & {
  deleteAllLabwareOffsets: UseMutateFunction<null>
}

export function useDeleteAllLabwareOffsetsMutation(): UseDeleteAllLabwareOffsetsMutationResult {
  const host = useHost()
  const queryClient = useQueryClient()

  const mutation = useMutation<null, unknown>(() =>
    deleteAllLabwareOffsets(host as HostConfig).then(response => {
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
    deleteAllLabwareOffsets: mutation.mutate,
  }
}
