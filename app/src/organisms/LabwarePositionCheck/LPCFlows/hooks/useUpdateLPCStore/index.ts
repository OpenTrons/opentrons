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
  OFFSETS_SOURCE_INITIALIZING,
} from '/app/redux/protocol-runs'
import { getActivePipetteId } from './utils'

import type { Run, StoredLabwareOffset } from '@opentrons/api-client'
import type { LPCWizardState, LPCLabwareInfo } from '/app/redux/protocol-runs'
import type { State } from '/app/redux/types'

export interface UseLPCInitialStateProps {
  runId: string | null
  runRecord: Run | undefined
  analysis: CompletedProtocolAnalysis | null
  protocolName: string | undefined
  maintenanceRunId: string | null
  labwareDefs: LabwareDefinition2[]
  labwareInfo: LPCLabwareInfo
  deckConfig: DeckConfiguration | undefined
  robotType: RobotType
  flexStoredOffsets: StoredLabwareOffset[] | undefined
}

// TODO(jh, 03-19-25): There's a lot of conditional, initial state patching
//  that occurs here and upstream. For clarity, consolidate.

// Update the LPC store if underlying store data is sufficiently present or changes.
export function useUpdateLPCStore({
  analysis,
  runId,
  labwareDefs,
  protocolName,
  runRecord,
  deckConfig,
  robotType,
  flexStoredOffsets,
  ...rest
}: UseLPCInitialStateProps): void {
  const dispatch = useDispatch()
  const lpcState = useSelector(
    (state: State) => state?.protocolRuns[runId ?? '']?.lpc
  )
  const runRecordOffsets = runRecord?.data.labwareOffsets

  const isReadyToInit =
    lpcState == null &&
    runId != null &&
    analysis != null &&
    protocolName != null &&
    deckConfig != null &&
    flexStoredOffsets !== undefined &&
    runRecordOffsets !== undefined

  // Initialize the store.
  useEffect(() => {
    if (isReadyToInit && robotType === FLEX_ROBOT_TYPE) {
      const activePipetteId = getActivePipetteId(analysis.pipettes)

      const initialState: LPCWizardState = {
        ...rest,
        protocolData: analysis,
        labwareDefs,
        activePipetteId: activePipetteId ?? 'NO_PIPETTE',
        protocolName,
        deckConfig,
        labwareInfo: {
          ...rest.labwareInfo,
          sourcedOffsets: OFFSETS_SOURCE_INITIALIZING,
          initialRunRecordOffsets: runRecordOffsets,
          initialDatabaseOffsets: flexStoredOffsets,
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

  // TOME TODO: Probably make a more specific state update just for the deck fonig
  //  and use it elsewhere. Change the name back to init.

  // Update the store.
  useEffect(() => {
    if (lpcState != null && runId != null) {
      const updatedState: LPCWizardState = {
        ...lpcState,
        deckConfig: deckConfig ?? lpcState.deckConfig,
      }

      dispatch(updateLPC(runId, updatedState))
    }
  }, [deckConfig, rest.labwareInfo])
}
