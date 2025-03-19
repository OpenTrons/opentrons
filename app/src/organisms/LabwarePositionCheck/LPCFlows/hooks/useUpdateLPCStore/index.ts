import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import type {
  CompletedProtocolAnalysis,
  DeckConfiguration,
  LabwareDefinition2,
  RobotType,
} from '@opentrons/shared-data'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  updateLPC,
  LPC_STEPS,
  OFFSETS_CONFLICT,
  OFFSETS_FROM_DATABASE,
} from '/app/redux/protocol-runs'
import { getActivePipetteId } from './utils'

import type {
  LPCLabwareInfo,
  LPCWizardState,
  OffsetSources,
} from '/app/redux/protocol-runs'
import type { State } from '/app/redux/types'

export interface UseLPCInitialStateProps {
  runId: string | null
  analysis: CompletedProtocolAnalysis | null
  protocolName: string | undefined
  maintenanceRunId: string | null
  labwareDefs: LabwareDefinition2[]
  labwareInfo: LPCLabwareInfo
  deckConfig: DeckConfiguration | undefined
  robotType: RobotType
  lastFreshOffsetRunTs: string | null
}

// Update the LPC store if underlying store data is sufficiently present or changes.
export function useUpdateLPCStore({
  analysis,
  runId,
  labwareDefs,
  protocolName,
  deckConfig,
  robotType,
  lastFreshOffsetRunTs,
  ...rest
}: UseLPCInitialStateProps): void {
  const dispatch = useDispatch()
  const lpcState = useSelector(
    (state: State) => state?.protocolRuns[runId ?? '']?.lpc
  )

  const isReadyToInit =
    lpcState == null &&
    runId != null &&
    analysis != null &&
    protocolName != null &&
    deckConfig != null

  // Initialize the store.
  useEffect(() => {
    if (isReadyToInit && robotType === FLEX_ROBOT_TYPE) {
      const activePipetteId = getActivePipetteId(analysis.pipettes)
      const sourcedOffsets: OffsetSources =
        lastFreshOffsetRunTs != null ? OFFSETS_CONFLICT : OFFSETS_FROM_DATABASE

      const initialState: LPCWizardState = {
        ...rest,
        protocolData: analysis,
        labwareDefs,
        activePipetteId,
        protocolName,
        deckConfig,
        labwareInfo: {
          ...rest.labwareInfo,
          lastFreshOffsetRunTimestamp: lastFreshOffsetRunTs,
          sourcedOffsets,
        },
        steps: {
          currentStepIndex: 0,
          totalStepCount: LPC_STEPS.length,
          all: LPC_STEPS,
          lastStepIndices: null,
          currentSubstep: null,
        },
      }

      dispatch(updateLPC(runId, initialState))
    }
  }, [isReadyToInit])

  // Update the store.
  useEffect(() => {
    if (lpcState != null && runId != null) {
      const updatedState: LPCWizardState = {
        ...lpcState,
        deckConfig: deckConfig != null ? deckConfig : lpcState.deckConfig,
        labwareInfo: {
          ...rest.labwareInfo,
          areOffsetsApplied: lpcState.labwareInfo.areOffsetsApplied,
          lastFreshOffsetRunTimestamp: lastFreshOffsetRunTs,
        },
      }

      dispatch(updateLPC(runId, updatedState))
    }
  }, [deckConfig, rest.labwareInfo, lastFreshOffsetRunTs])
}
