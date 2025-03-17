import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'

import {
  retractPipetteAxesSequentiallyCommands,
  verifyProbeAttachmentAndHomeCommands,
} from './commands'
import { LPC_STEP, selectCurrentStep } from '/app/redux/protocol-runs'

import type { CreateCommand, LoadedPipette } from '@opentrons/shared-data'
import type { UseLPCCommandWithChainRunChildProps } from './types'

export interface UseProbeCommandsResult {
  handleProbeAttachment: (pipette: LoadedPipette | null) => Promise<void>
  handleProbeDetachment: (
    pipette: LoadedPipette | null,
    onSuccess: () => void
  ) => Promise<void>
  unableToDetect: boolean
}

export function useHandleProbeCommands({
  chainLPCCommands,
  runId,
}: UseLPCCommandWithChainRunChildProps): UseProbeCommandsResult {
  const [showUnableToDetect, setShowUnableToDetect] = useState<boolean>(false)
  const currentStep = useSelector(selectCurrentStep(runId))

  // We only care about probe detection on the "attach probe" step. When that
  // step is not active, do not permit redirection to the "probe not attached" view.
  useEffect(() => {
    if (currentStep !== LPC_STEP.ATTACH_PROBE && showUnableToDetect) {
      setShowUnableToDetect(false)
    }
  }, [currentStep, showUnableToDetect])

  const handleProbeAttachment = (
    pipette: LoadedPipette | null
  ): Promise<void> => {
    const attachmentCommands: CreateCommand[] = [
      ...verifyProbeAttachmentAndHomeCommands(pipette),
    ]

    return chainLPCCommands(attachmentCommands, false, true)
      .catch(() => {
        setShowUnableToDetect(true)
        return Promise.reject(new Error('Unable to detect probe.'))
      })
      .then(() => {
        setShowUnableToDetect(false)
      })
  }

  const handleProbeDetachment = (
    pipette: LoadedPipette | null,
    onSuccess: () => void
  ): Promise<void> => {
    const detatchmentCommands: CreateCommand[] = [
      ...retractPipetteAxesSequentiallyCommands(pipette),
    ]

    return chainLPCCommands(detatchmentCommands, false).then(() => {
      onSuccess()
    })
  }

  return {
    handleProbeAttachment,
    unableToDetect: showUnableToDetect,
    handleProbeDetachment,
  }
}
