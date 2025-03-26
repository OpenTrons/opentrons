import { LPC_STEPS } from '/app/redux/protocol-runs'

import type { ProceedStepAction, StepInfo } from '/app/redux/protocol-runs'

export function getNextStepIdx(
  action: ProceedStepAction,
  stepState: StepInfo
): number {
  const { toStep } = action.payload
  const { currentStepIndex, totalStepCount } = stepState

  if (toStep == null) {
    return currentStepIndex + 1 < totalStepCount
      ? currentStepIndex + 1
      : currentStepIndex
  } else {
    const newIdx = LPC_STEPS.findIndex(step => step === toStep)

    if (newIdx === -1) {
      console.error(`Unexpected routing to step: ${toStep}`)
      return 0
    } else {
      return newIdx
    }
  }
}
