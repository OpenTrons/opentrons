import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'

import {
  updateRunSetupStepsRequired,
  getSetupStepsRequired,
  ROBOT_CALIBRATION_STEP_KEY,
  MODULE_SETUP_STEP_KEY,
  LPC_STEP_KEY,
  LABWARE_SETUP_STEP_KEY,
  LIQUID_SETUP_STEP_KEY,
  selectTotalCountLocationSpecificOffsets,
} from '/app/redux/protocol-runs'

import type {
  StepKey,
  StepMap,
  UpdateRunSetupStepsRequiredAction,
} from '/app/redux/protocol-runs'
import type { Dispatch, State } from '/app/redux/types'
import type {
  CompletedProtocolAnalysis,
  ProtocolAnalysisOutput,
} from '@opentrons/shared-data'

export interface UseRequiredSetupStepsInOrderProps {
  runId: string
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
}

export interface UseRequiredSetupStepsInOrderReturn {
  orderedSteps: readonly StepKey[]
  orderedApplicableSteps: readonly StepKey[]
}

const ALL_STEPS_IN_ORDER = [
  ROBOT_CALIBRATION_STEP_KEY,
  MODULE_SETUP_STEP_KEY,
  LPC_STEP_KEY,
  LABWARE_SETUP_STEP_KEY,
  LIQUID_SETUP_STEP_KEY,
] as const

const NO_ANALYSIS_STEPS_IN_ORDER = [
  ROBOT_CALIBRATION_STEP_KEY,
  LPC_STEP_KEY,
  LABWARE_SETUP_STEP_KEY,
]

const keysInOrder = (
  protocolAnalysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null,
  noLwOffsetsInRun: boolean
): UseRequiredSetupStepsInOrderReturn => {
  const orderedSteps =
    protocolAnalysis == null ? NO_ANALYSIS_STEPS_IN_ORDER : ALL_STEPS_IN_ORDER

  const orderedApplicableSteps =
    protocolAnalysis == null
      ? NO_ANALYSIS_STEPS_IN_ORDER
      : ALL_STEPS_IN_ORDER.filter((stepKey: StepKey) => {
          if (
            stepKey === MODULE_SETUP_STEP_KEY &&
            protocolAnalysis.modules.length === 0
          ) {
            return false
          } else if (
            stepKey === LIQUID_SETUP_STEP_KEY &&
            protocolAnalysis.liquids.length === 0
          ) {
            return false
          } else if (stepKey === LPC_STEP_KEY && noLwOffsetsInRun) {
            return false
          } else {
            return true
          }
        })
  return { orderedSteps: orderedSteps as StepKey[], orderedApplicableSteps }
}

const keyFor = (
  analysis: CompletedProtocolAnalysis | ProtocolAnalysisOutput | null
  // @ts-expect-error(sf, 2024-10-23): purposeful weak object typing
): string | null => analysis?.id ?? analysis?.metadata?.id ?? null

export function useRequiredSetupStepsInOrder({
  runId,
  protocolAnalysis,
}: UseRequiredSetupStepsInOrderProps): UseRequiredSetupStepsInOrderReturn {
  const dispatch = useDispatch<Dispatch>()
  const requiredSteps = useSelector<State>(state =>
    getSetupStepsRequired(state, runId)
  )
  const noLwOffsetsInRun =
    useSelector(selectTotalCountLocationSpecificOffsets(runId)) === 0

  useEffect(() => {
    const applicable = keysInOrder(protocolAnalysis, noLwOffsetsInRun)
    dispatch(
      updateRunSetupStepsRequired(runId, {
        ...ALL_STEPS_IN_ORDER.reduce<
          UpdateRunSetupStepsRequiredAction['payload']['required']
        >(
          (acc, thiskey) => ({
            ...acc,
            [thiskey]: applicable.orderedApplicableSteps.includes(thiskey),
          }),
          {}
        ),
      })
    )
  }, [runId, keyFor(protocolAnalysis), dispatch])
  return protocolAnalysis == null
    ? {
        orderedSteps: NO_ANALYSIS_STEPS_IN_ORDER,
        orderedApplicableSteps: NO_ANALYSIS_STEPS_IN_ORDER,
      }
    : {
        orderedSteps: ALL_STEPS_IN_ORDER,
        orderedApplicableSteps: ALL_STEPS_IN_ORDER.filter(
          step => (requiredSteps as Required<StepMap<boolean>> | null)?.[step]
        ),
      }
}
