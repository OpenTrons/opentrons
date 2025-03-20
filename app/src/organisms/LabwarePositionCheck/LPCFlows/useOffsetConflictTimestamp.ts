import { useDispatch, useSelector } from 'react-redux'
import isEqual from 'lodash/isEqual'

import { useNotifyAllRunsQuery } from '/app/resources/runs'
import {
  selectAreOffsetsApplied,
  selectConflictTimestampInfo,
  selectInitialDatabaseOffsets,
  selectInitialRunRecordOffsets,
  updateConflictTimestamp,
} from '/app/redux/protocol-runs'

import type {
  StoredLabwareOffset,
  Run,
  LabwareOffset,
} from '@opentrons/api-client'
import type { State } from '/app/redux/types'

// TODO(jh, 03-20-25): This hook can live entirely in Redux if we move run-agnostic data like "allRuns" into the store!

// If the run initializes with offset data (ex, from a cloned run) and any run-provided offset
// is stale, return the timestamp of the last time this protocol was run prior to the current run.
export function useOffsetConflictTimestamp(
  isFlex: boolean,
  runId: string | null,
  currentRunRecord: Run | undefined
): void {
  const dispatch = useDispatch()
  const currentRunId = runId ?? ''

  // TODO(jh, 03-17-25): The assumption that we will be able to find the relevant
  //  run only works because a user can only clone a run from the past default
  //  useNotifyAllRunsQuery() number of runs. Cloned run state should be in Redux.
  const allRuns = useNotifyAllRunsQuery()
  const lpcState = useSelector(
    (state: State) => state?.protocolRuns[currentRunId]?.lpc
  )
  const areOffsetsApplied = useSelector(selectAreOffsetsApplied(currentRunId))
  // We only care about stored offset data at run initialization,
  // before the user has entered LPC and updated
  // any offsets, otherwise this hook will always return a timestamp.
  const initialRunRecordOffsets = useSelector(
    selectInitialRunRecordOffsets(currentRunId)
  )
  const initialDatabaseOffsets = useSelector(
    selectInitialDatabaseOffsets(currentRunId)
  )
  const existingConflictInfo = useSelector(
    selectConflictTimestampInfo(currentRunId)
  )
  const historicRunData = allRuns.data?.data.filter(
    run => run.current === false
  )

  const isInitializing =
    runId == null ||
    lpcState == null ||
    historicRunData == null ||
    currentRunRecord == null

  if (
    isFlex &&
    !existingConflictInfo.isInitialized &&
    !isInitializing &&
    !areOffsetsApplied // if a different app has finalized offsets, don't return a conflict
  ) {
    const outdatedOffsetExists = outdatedOffsetExits(
      initialRunRecordOffsets,
      initialDatabaseOffsets
    )

    if (outdatedOffsetExists) {
      // Find the most recent historic run.
      const matchingRecord = historicRunData.findLast(
        run =>
          run.protocolId != null &&
          run.protocolId === currentRunRecord.data.protocolId
      )

      dispatch(
        updateConflictTimestamp(runId, {
          isInitialized: true,
          timestamp: matchingRecord?.createdAt ?? '',
        })
      )
    } else {
      dispatch(
        updateConflictTimestamp(runId, { isInitialized: true, timestamp: null })
      )
    }
  }
}

// Whether any cloned offset is older than its stored location-specific offset,
// or if a stored location-specific offset is not found, its default offset.
function outdatedOffsetExits(
  initialRunRecordLwOffsets: LabwareOffset[],
  initialStoredOffsets: StoredLabwareOffset[]
): boolean {
  const sortedUniqueInitialRunRecordOffsets = initialRunRecordLwOffsets
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .reduce<LabwareOffset[]>((acc, offset) => {
      if (
        acc.some(
          existingOffset =>
            isEqual(existingOffset.definitionUri, offset.definitionUri) &&
            isEqual(existingOffset.locationSequence, offset.locationSequence)
        )
      ) {
        return acc
      } else {
        return [...acc, offset]
      }
    }, [])

  const { anyKnownOutdated, unknownOutdated } = getOutdatedLSOffsetInfo(
    sortedUniqueInitialRunRecordOffsets,
    initialStoredOffsets
  )

  if (anyKnownOutdated) {
    return true
  } else {
    return getAnyOutdatedDefaultOffset(unknownOutdated, initialStoredOffsets)
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
  initialRunRecordLwOffsets: LabwareOffset[],
  initialStoredOffsets: StoredLabwareOffset[]
): OutdatedLSOffsetInfo {
  let anyKnownOutdated = false

  const unknownOutdated = initialRunRecordLwOffsets.filter(clonedOffset => {
    const matchingStoredOffset = initialStoredOffsets.find(
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
  unmatchedInitialRunRecordOffsets: LabwareOffset[],
  initialStoredOffsets: StoredLabwareOffset[]
): boolean {
  return unmatchedInitialRunRecordOffsets.some(clonedOffset => {
    const matchingStoredOffset = initialStoredOffsets.findLast(storedOffset => {
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
