import { useState } from 'react'
import { useChainMaintenanceCommands } from '/app/resources/maintenance_runs'
import { retractSafelyAndHomeCommands } from './commands'

import type { UseLPCCommandChildProps } from './types'
import type { CreateCommand } from '@opentrons/shared-data'

export interface UseHandleConditionalCleanupResult {
  isExiting: boolean
  handleHomeAndClose: () => Promise<void>
  handleCloseNoHome: () => Promise<void>
}

export function useHandleClose({
  onCloseClick,
  maintenanceRunId,
}: UseLPCCommandChildProps): UseHandleConditionalCleanupResult {
  const [isExiting, setIsExiting] = useState(false)
  const { chainRunCommands } = useChainMaintenanceCommands()

  const handleHomeAndClose = (): Promise<void> => {
    setIsExiting(true)
    const cleanupCommands: CreateCommand[] = [...retractSafelyAndHomeCommands()]

    return chainRunCommands(maintenanceRunId, cleanupCommands, true)
      .then(() => {
        onCloseClick()
      })
      .catch(() => {
        onCloseClick()
      })
  }

  const handleCloseNoHome = (): Promise<void> => {
    setIsExiting(true)

    return new Promise(() => {
      onCloseClick()
    })
  }

  return { isExiting, handleHomeAndClose, handleCloseNoHome }
}
