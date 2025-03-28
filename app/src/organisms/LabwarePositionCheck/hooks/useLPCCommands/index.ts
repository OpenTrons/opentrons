import { useState } from 'react'

import { useHandleJog } from './useHandleJog'
import { useHandleClose } from './useHandleClose'
import { useChainMaintenanceCommands } from '/app/resources/maintenance_runs'
import { useHandleProbeCommands } from './useHandleProbeCommands'
import { useHandleStartLPC } from './useHandleStartLPC'
import { useHandlePrepModules } from './useHandlePrepModules'
import { useHandleConfirmLwModulePlacement } from './useHandleConfirmLwModulePlacement'
import { useHandleConfirmLwFinalPosition } from './useHandleConfirmLwFinalPosition'
import { useHandleResetLwModulesOnDeck } from './useHandleResetLwModulesOnDeck'
import { useSaveWorkingOffsets } from './useSaveWorkingOffsets'
import { useHandleValidMoveToMaintenancePosition } from './useHandleValidMoveToMaintenancePosition'

import type { CreateCommand } from '@opentrons/shared-data'
import type { CommandData } from '@opentrons/api-client'
import type { UseProbeCommandsResult } from './useHandleProbeCommands'
import type { UseHandleConditionalCleanupResult } from './useHandleClose'
import type { UseHandleJogResult } from './useHandleJog'
import type { UseHandleStartLPCResult } from './useHandleStartLPC'
import type { UseHandlePrepModulesResult } from './useHandlePrepModules'
import type { UseHandleConfirmPlacementResult } from './useHandleConfirmLwModulePlacement'
import type { UseHandleConfirmPositionResult } from './useHandleConfirmLwFinalPosition'
import type { UseHandleResetLwModulesOnDeckResult } from './useHandleResetLwModulesOnDeck'
import type { LPCWizardFlexProps } from '/app/organisms/LabwarePositionCheck/LPCWizardFlex'
import type { UseBuildOffsetsToApplyResult } from './useSaveWorkingOffsets'
import type { UseHandleValidMoveToMaintenancePositionResult } from './useHandleValidMoveToMaintenancePosition'
import { fullHomeCommands } from '/app/organisms/LabwarePositionCheck/hooks/useLPCCommands/commands'

export interface UseLPCCommandsProps extends LPCWizardFlexProps {}

export type UseLPCCommandsResult = UseHandleJogResult &
  UseHandleConditionalCleanupResult &
  UseProbeCommandsResult &
  UseHandleStartLPCResult &
  UseHandlePrepModulesResult &
  UseHandleConfirmPlacementResult &
  UseHandleConfirmPositionResult &
  UseBuildOffsetsToApplyResult &
  UseHandleResetLwModulesOnDeckResult &
  UseHandleValidMoveToMaintenancePositionResult & {
    errorMessage: string | null
    isRobotMoving: boolean
    toggleRobotMoving: (isMoving: boolean) => Promise<void>
    home: () => Promise<void>
  }

// Consolidates all command handlers and handler state for injection into LPC.
export function useLPCCommands(
  props: UseLPCCommandsProps
): UseLPCCommandsResult {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isRobotMoving, setIsRobotMoving] = useState(false)

  const { chainRunCommands } = useChainMaintenanceCommands()

  const chainLPCCommands = (
    commands: CreateCommand[],
    continuePastCommandFailure: boolean,
    shouldPropogateError?: boolean // Let a higher level handler manage the error.
  ): Promise<CommandData[]> =>
    chainRunCommands(
      props.maintenanceRunId,
      commands,
      continuePastCommandFailure
    ).catch((e: Error) => {
      if (!shouldPropogateError) {
        console.error(`Error during LPC command: ${e.message}`)
        setErrorMessage(`Error during LPC command: ${e.message}`)
        return Promise.resolve([])
      } else {
        console.error(`Error during LPC command: ${e.message}`)
        return Promise.reject(e)
      }
    })

  const applyWorkingOffsets = useSaveWorkingOffsets({ ...props })
  const handleJogUtils = useHandleJog({
    ...props,
    setErrorMessage,
    chainLPCCommands,
  })
  const handleConditionalCleanupUtils = useHandleClose(props)
  const handleProbeCommands = useHandleProbeCommands({
    ...props,
    chainLPCCommands,
  })
  const handleStartLPC = useHandleStartLPC({ ...props, chainLPCCommands })
  const handlePrepModules = useHandlePrepModules({ ...props, chainLPCCommands })
  const handleConfirmLwModulePlacement = useHandleConfirmLwModulePlacement({
    ...props,
    chainLPCCommands,
    setErrorMessage,
  })
  const handleConfirmLwFinalPosition = useHandleConfirmLwFinalPosition({
    ...props,
    chainLPCCommands,
    setErrorMessage,
  })
  const handleResetLwModulesOnDeck = useHandleResetLwModulesOnDeck({
    ...props,
    chainLPCCommands,
  })
  const handleValidMoveToMaintenancePosition = useHandleValidMoveToMaintenancePosition(
    { ...props, chainLPCCommands }
  )

  return {
    errorMessage,
    isRobotMoving,
    toggleRobotMoving: (isMoving: boolean) =>
      new Promise<void>(resolve => {
        setIsRobotMoving(isMoving)
        resolve()
      }),
    home: () =>
      chainLPCCommands(fullHomeCommands(), false).then(() => Promise.resolve()),
    ...applyWorkingOffsets,
    ...handleJogUtils,
    ...handleConditionalCleanupUtils,
    ...handleProbeCommands,
    ...handleStartLPC,
    ...handlePrepModules,
    ...handleConfirmLwModulePlacement,
    ...handleConfirmLwFinalPosition,
    ...handleResetLwModulesOnDeck,
    ...handleValidMoveToMaintenancePosition,
  }
}
