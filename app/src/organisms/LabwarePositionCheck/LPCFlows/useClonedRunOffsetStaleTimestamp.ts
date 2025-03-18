import { useEffect, useState, useRef } from 'react'
import isEqual from 'lodash/isEqual'

import { useSearchLabwareOffsets } from '@opentrons/react-api-client'

import { useNotifyAllRunsQuery } from '/app/resources/runs'

import type {
  StoredLabwareOffset,
  Run,
  LabwareOffset,
  SearchLabwareOffsetsData,
} from '@opentrons/api-client'

// TODO(jh, 03-18-25): Much of the complexity here is because of the desktop
//  run tabs not fully re-rendering when clicking "run again". Revisit total tab
//  state re-rendering.

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
  const [clonedLwOffsets, setClonedLwOffsets] = useState<
    LabwareOffset[] | null
  >(null)
  const [thisCurrentRunId, setThisCurrentRunId] = useState<string | null>(null)

  // Store initial search results to prevent subsequent updates.
  const initialOffsetDataRef = useRef<StoredLabwareOffset[] | null>(null)

  // Use a unique queryKey for this instance to prevent shared cache updates
  const queryKey = useRef([
    'labware-offsets',
    storedOffsetSearchParams,
    currentRunRecord?.data.id || 'no-id',
    'isolated-instance',
  ])

  const {
    data: searchOffsetsData,
    refetch: searchOffsetsRefetch,
  } = useSearchLabwareOffsets(storedOffsetSearchParams, {
    enabled: storedOffsetSearchParams.filters.length > 0,
    staleTime: Infinity,
    cacheTime: Infinity,
    // Use a stable queryKey specific to this instance
    queryKey: queryKey.current,
    // Prevent this query from refetching automatically
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
  })

  const storedOffsets = initialOffsetDataRef.current || searchOffsetsData?.data
  const historicRunData = allRuns.data?.data.filter(
    run => run.current === false
  )
  const currentRunId = currentRunRecord?.data.id

  // Store the initial data and use it instead of potentially updated data.
  useEffect(() => {
    if (searchOffsetsData?.data && initialOffsetDataRef.current === null) {
      initialOffsetDataRef.current = [...searchOffsetsData.data]
    }
  }, [searchOffsetsData])

  // On the desktop app, cloning a run should effectively reset hook state appropriately.
  useEffect(() => {
    if (currentRunId != null && currentRunId !== thisCurrentRunId) {
      setThisCurrentRunId(currentRunId)
      setClonedLwOffsets(currentRunRecord?.data.labwareOffsets ?? null)
      // Reset our stored data reference when explicitly requesting a refetch
      initialOffsetDataRef.current = null
      void searchOffsetsRefetch()
    }
  }, [currentRunId, thisCurrentRunId, searchOffsetsRefetch, currentRunRecord])

  if (
    currentRunRecord == null ||
    storedOffsets == null ||
    historicRunData == null
  ) {
    return 'LOADING'
  }
  // No labware offsets means the run wasn't cloned with offsets.
  else if (clonedLwOffsets == null) {
    return null
  } else {
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
}

// Whether any cloned offset is older than its stored location-specific offset,
// or if a stored location-specific offset is not found, its default offset.
function outdatedOffsetExits(
  clonedLwOffsets: LabwareOffset[],
  storedOffsets: StoredLabwareOffset[]
): boolean {
  const { anyKnownOutdated, unknownOutdated } = getOutdatedLSOffsetInfo(
    clonedLwOffsets,
    storedOffsets
  )

  if (anyKnownOutdated) {
    return true
  } else {
    return getAnyOutdatedDefaultOffset(unknownOutdated, storedOffsets)
  }
}

interface OutdatedLSOffsetInfo {
  // For a cloned run, if we do not find a matching location-specific offset,
  // we will certainly find a matching default offset.
  unknownOutdated: LabwareOffset[]
  anyKnownOutdated: boolean
}

// Parse the cloned-run location-specific offsets. If we find a matching location-specific
// offset, and it's outdated, return that info. If we cannot match a location-specific
// offset with the server location-specific offset, return that info, too.
function getOutdatedLSOffsetInfo(
  clonedLwOffsets: LabwareOffset[],
  storedOffsets: StoredLabwareOffset[]
): OutdatedLSOffsetInfo {
  let anyKnownOutdated = false

  const unknownOutdated = clonedLwOffsets.filter(clonedOffset => {
    const matchingStoredOffset = storedOffsets.find(
      storedOffset =>
        isEqual(clonedOffset.locationSequence, storedOffset.locationSequence) &&
        isEqual(clonedOffset.definitionUri, storedOffset.definitionUri)
    )

    const isKnownOutdated =
      matchingStoredOffset != null &&
      !isEqual(clonedOffset.vector, matchingStoredOffset.vector)

    if (isKnownOutdated) {
      anyKnownOutdated = true
    }

    return matchingStoredOffset == null
  })

  return { anyKnownOutdated, unknownOutdated }
}

// Whether any unmatched cloned run offsets are different from the server-stored counterparts.
function getAnyOutdatedDefaultOffset(
  unmatchedClonedRunOffsets: LabwareOffset[],
  storedOffsets: StoredLabwareOffset[]
): boolean {
  return unmatchedClonedRunOffsets.some(clonedOffset => {
    const matchingStoredOffset = storedOffsets.find(storedOffset => {
      return (
        storedOffset.locationSequence === 'anyLocation' &&
        isEqual(clonedOffset.definitionUri, storedOffset.definitionUri)
      )
    })

    return (
      matchingStoredOffset != null &&
      !isEqual(clonedOffset.vector, matchingStoredOffset.vector)
    )
  })
}
