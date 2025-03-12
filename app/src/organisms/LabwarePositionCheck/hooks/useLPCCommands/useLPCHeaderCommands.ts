import { useSelector } from 'react-redux'

import { LPC_STEP, selectActivePipette } from '/app/redux/protocol-runs'

import type { LPCWizardContentProps } from '/app/organisms/LabwarePositionCheck/types'
import type { UseLPCCommandsResult } from '/app/organisms/LabwarePositionCheck/hooks'

export type UseLPCHeaderCommandsProps = Omit<
  LPCWizardContentProps,
  'commandUtils'
> & {
  LPCHandlerUtils: UseLPCCommandsResult
}

export interface UseLPCHeaderCommandsResult {
  handleProceed: () => void
  handleAttachProbeCheck: () => void
  handleNavToDetachProbe: () => void
  handleClose: () => void
}

// Wraps core LPC command functionality, since the header component reuses many of the same commands.
export function useLPCHeaderCommands({
  LPCHandlerUtils,
  proceedStep,
  runId,
}: UseLPCHeaderCommandsProps): UseLPCHeaderCommandsResult {
  const activePipette = useSelector(selectActivePipette(runId))
  const pipette = useSelector(selectActivePipette(runId))

  const {
    handleStartLPC,
    toggleRobotMoving,
    handleValidMoveToMaintenancePosition,
    handleCleanUpAndClose,
    handleProbeAttachment,
  } = LPCHandlerUtils

  const handleProceed = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleStartLPC(activePipette, proceedStep))
      .finally(() => toggleRobotMoving(false))
  }

  // If the maintenance run fails, we cannot move the gantry, so just clean up LPC.
  const handleClose = (): void => {
    void toggleRobotMoving(true).then(() => {
      void handleCleanUpAndClose()
    })
  }

  const handleAttachProbeCheck = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleProbeAttachment(pipette, proceedStep))
      .finally(() => toggleRobotMoving(false))
  }

  const handleNavToDetachProbe = (): void => {
    void toggleRobotMoving(true)
      .then(() => handleValidMoveToMaintenancePosition(pipette))
      .then(() => {
        proceedStep(LPC_STEP.DETACH_PROBE)
      })
      .finally(() => toggleRobotMoving(false))
  }

  return {
    handleProceed,
    handleAttachProbeCheck,
    handleNavToDetachProbe,
    handleClose,
  }
}
