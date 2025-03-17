import { useEffect } from 'react'
import { useDispatch } from 'react-redux'

import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import { startLPC, LPC_STEPS } from '/app/redux/protocol-runs'
import { getActivePipetteId } from './utils'

import type { LPCWizardState, LPCLabwareInfo } from '/app/redux/protocol-runs'
import type {
  CompletedProtocolAnalysis,
  DeckConfiguration,
  LabwareDefinition2,
  RobotType,
} from '@opentrons/shared-data'

export interface UseLPCInitialStateProps {
  runId: string
  mostRecentAnalysis: CompletedProtocolAnalysis | null
  protocolName: string | undefined
  maintenanceRunId: string | null
  labwareDefs: LabwareDefinition2[]
  labwareInfo: LPCLabwareInfo
  deckConfig: DeckConfiguration | undefined
  robotType: RobotType
}

// Initialize the LPC store if store data is sufficiently present.
export function useInitLPCStore({
  mostRecentAnalysis,
  runId,
  labwareDefs,
  protocolName,
  deckConfig,
  robotType,
  ...rest
}: UseLPCInitialStateProps): void {
  const dispatch = useDispatch()

  const isReadyToInit =
    mostRecentAnalysis != null && protocolName != null && deckConfig != null

  useEffect(() => {
    if (isReadyToInit && robotType === FLEX_ROBOT_TYPE) {
      const activePipetteId = getActivePipetteId(mostRecentAnalysis.pipettes)

      const initialState: LPCWizardState = {
        ...rest,
        protocolData: mostRecentAnalysis,
        labwareDefs,
        activePipetteId,
        protocolName,
        deckConfig,
        steps: {
          currentStepIndex: 0,
          totalStepCount: LPC_STEPS.length,
          all: LPC_STEPS,
          lastStepIndices: null,
          currentSubstep: null,
        },
      }

      dispatch(startLPC(runId, initialState))
    }
  }, [isReadyToInit, deckConfig])
}
