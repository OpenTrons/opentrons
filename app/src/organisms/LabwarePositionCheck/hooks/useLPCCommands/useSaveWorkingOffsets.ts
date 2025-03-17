import { useSelector } from 'react-redux'
import { useState } from 'react'

import {
  useCreateLabwareOffsetsMutation,
  useDeleteLabwareOffsetMutation,
} from '@opentrons/react-api-client'

import { selectPendingOffsetOperations } from '/app/redux/protocol-runs'

import type { StoredLabwareOffset } from '@opentrons/api-client'
import type { UseLPCCommandChildProps } from '/app/organisms/LabwarePositionCheck/hooks/useLPCCommands/types'

export interface UseBuildOffsetsToApplyResult {
  // Update the server with the current working offsets, returning the updated offsets.
  saveWorkingOffsets: () => Promise<StoredLabwareOffset[]>
  isSavingWorkingOffsetsLoading: boolean
}

export function useSaveWorkingOffsets({
  runId,
}: UseLPCCommandChildProps): UseBuildOffsetsToApplyResult {
  const [isLoading, setIsLoading] = useState(false)

  const { toUpdate, toDelete } = useSelector(
    selectPendingOffsetOperations(runId)
  )
  const { createLabwareOffsets } = useCreateLabwareOffsetsMutation()
  const { deleteLabwareOffset } = useDeleteLabwareOffsetMutation()

  const deleteLabwareOffsets = (): Promise<StoredLabwareOffset[]> => {
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    const deletePromises = toDelete.map(id => deleteLabwareOffset(id))
    return Promise.all(deletePromises)
  }

  const saveWorkingOffsets = (): Promise<StoredLabwareOffset[]> => {
    setIsLoading(true)

    return Promise.all([createLabwareOffsets(toUpdate), deleteLabwareOffsets()])
      .then(([createRes, deleteRes]) => {
        setIsLoading(false)

        if (Array.isArray(createRes)) {
          return [...createRes, ...deleteRes]
        } else {
          return [createRes, ...deleteRes]
        }
      })
      .catch(() => {
        setIsLoading(false)

        return []
      })
  }

  return {
    isSavingWorkingOffsetsLoading: isLoading,
    saveWorkingOffsets,
  }
}
