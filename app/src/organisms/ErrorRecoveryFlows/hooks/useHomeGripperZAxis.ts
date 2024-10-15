import { useLayoutEffect, useState } from 'react'
import { RECOVERY_MAP } from '/app/organisms/ErrorRecoveryFlows/constants'

import type { ErrorRecoveryWizardProps } from '/app/organisms/ErrorRecoveryFlows/ErrorRecoveryWizard'

// Home the gripper z-axis implicitly. Because the z-home is not tied to a CTA, it must be handled here.
export function useHomeGripperZAxis({
  recoveryCommands,
  routeUpdateActions,
  recoveryMap,
  doorStatusUtils,
}: ErrorRecoveryWizardProps): void {
  const { step } = recoveryMap
  const { isDoorOpen } = doorStatusUtils
  const [hasHomedOnce, setHasHomedOnce] = useState(false)

  const isManualGripperStep =
    step === RECOVERY_MAP.MANUAL_REPLACE_AND_RETRY.STEPS.MANUAL_REPLACE ||
    step === RECOVERY_MAP.MANUAL_MOVE_AND_SKIP.STEPS.MANUAL_MOVE

  useLayoutEffect(() => {
    const { handleMotionRouting, goBackPrevStep } = routeUpdateActions
    const { homeGripperZAxis } = recoveryCommands

    if (!hasHomedOnce) {
      if (isManualGripperStep) {
        if (isDoorOpen) {
          void goBackPrevStep()
        } else {
          void handleMotionRouting(true)
            .then(() => homeGripperZAxis())
            .then(() => {
              setHasHomedOnce(true)
            })
            .finally(() => handleMotionRouting(false))
        }
      }
    } else {
      if (!isManualGripperStep) {
        setHasHomedOnce(false)
      }
    }
  }, [step, hasHomedOnce, isDoorOpen, isManualGripperStep])
}
