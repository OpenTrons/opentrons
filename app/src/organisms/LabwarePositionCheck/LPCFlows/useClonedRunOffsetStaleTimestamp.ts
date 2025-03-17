import isEqual from 'lodash/isEqual'

import { useNotifyAllRunsQuery } from '/app/resources/runs'

import type {
  StoredLabwareOffset,
  Run,
  LabwareOffset,
  SearchLabwareOffsetsData,
} from '@opentrons/api-client'
import type { LPCOffsetKind } from '/app/redux/protocol-runs'
import { useSearchLabwareOffsets } from '@opentrons/react-api-client'
import { useEffect } from 'react'

// If the run initializes with offset data (from a cloned run) and any cloned offset
// is stale, return the timestamp of the last time this protocol was run prior to the
// current run.
export function useClonedRunOffsetStaleTimestamp(
  currentRunRecord: Run | undefined,
  storedOffsetSearchParams: SearchLabwareOffsetsData
): string | null {
  // TODO(jh, 03-17-25): The assumption that we will be able to find the relevant
  //  run only works because a user can only clone a run from the past default
  //  useNotifyAllRunsQuery() number of runs. Cloned run state should be in Redux.
  const allRuns = useNotifyAllRunsQuery()
  // We only care about stored offset data at run initialization,
  // before the user has entered LPC and updated
  // any offsets, otherwise this hook will always return a timestamp.
  const {
    data: searchOffsetsData,
    refetch: searchOffsetsRefetch,
  } = useSearchLabwareOffsets(storedOffsetSearchParams, {
    enabled: storedOffsetSearchParams.filters.length > 0,
    staleTime: Infinity,
  })
  const storedOffsets = searchOffsetsData?.data
  const historicRunData = allRuns.data?.data.filter(
    run => run.current === false
  )
  const clonedLwOffsets = currentRunRecord?.data.labwareOffsets

  // On the desktop app, cloning a run should effectively rerun this hook.
  useEffect(() => {
    void searchOffsetsRefetch()
  }, [currentRunRecord])

  if (
    currentRunRecord == null ||
    storedOffsets == null ||
    historicRunData == null
  ) {
    return 'LOADING'
  }

  // No labware offsets means the run wasn't cloned with offsets.
  if (clonedLwOffsets == null) {
    return null
  }

  const outdatedOffsetExists = outdatedOffsetExits(
    clonedLwOffsets,
    storedOffsets
  )

  if (outdatedOffsetExists) {
    // Find the most recent historic run.
    const matchingRecord = historicRunData.findLast(
      run =>
        run.protocolId != null &&
        run.protocolId === currentRunRecord.data.protocolId
    )

    return matchingRecord?.createdAt ?? ''
  } else {
    return null
  }
}

// Whether a cloned offset is older than a stored location-specific offset,
// or if a stored location-specific offset is not found, the default offset.
function outdatedOffsetExits(
  clonedLwOffsets: LabwareOffset[],
  storedOffsets: StoredLabwareOffset[]
): boolean {
  const isOutdatedLSOffset = getOutdatedOffsetExistsFor(
    'location-specific',
    clonedLwOffsets,
    storedOffsets
  )
  const isOutdatedDefaultOffset = getOutdatedOffsetExistsFor(
    'default',
    clonedLwOffsets,
    storedOffsets
  )

  return isOutdatedLSOffset || isOutdatedDefaultOffset
}

function getOutdatedOffsetExistsFor(
  offsetKind: LPCOffsetKind,
  clonedLwOffsets: LabwareOffset[],
  storedOffsets: StoredLabwareOffset[]
): boolean {
  return clonedLwOffsets.some(clonedOffset => {
    const matchingStoredOffset = storedOffsets.find(storedOffset => {
      return offsetKind === 'location-specific'
        ? isEqual(
            clonedOffset.locationSequence,
            storedOffset.locationSequence
          ) && isEqual(clonedOffset.definitionUri, storedOffset.definitionUri)
        : storedOffset.locationSequence === 'anyLocation' &&
            isEqual(clonedOffset.definitionUri, storedOffset.definitionUri)
    })

    return (
      matchingStoredOffset != null &&
      new Date(clonedOffset.createdAt) <
        new Date(matchingStoredOffset.createdAt)
    )
  })
}
