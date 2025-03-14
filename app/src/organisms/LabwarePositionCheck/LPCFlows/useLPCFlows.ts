import { useEffect, useMemo, useState } from 'react'

import { getLabwareDefinitionsFromCommands } from '@opentrons/components'
import {
  useCreateMaintenanceRunLabwareDefinitionMutation,
  useDeleteMaintenanceRunMutation,
  useRunLoadedLabwareDefinitions,
} from '@opentrons/react-api-client'

import {
  useCreateTargetedMaintenanceRunMutation,
  useMostRecentCompletedAnalysis,
} from '/app/resources/runs'
import { useNotifyCurrentMaintenanceRun } from '/app/resources/maintenance_runs'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'
import { useLPCLabwareInfo } from '/app/organisms/LabwarePositionCheck/LPCFlows/hooks'
import { getRelevantOffsets } from '/app/organisms/LabwarePositionCheck/LPCFlows/utils'

// TOME TODO: Definitely test OT-2 flows before merging!

// TOME TODO: For posting offsets,
//  I think the current hook that's used in the legacy LPC flows works. You can always
//  post the list of offsets at run start. You do NOT and should NOT create runs with offsets now.
//  Always post them at run start, and have a selector to check whether LPC offsets have
// been confirmed, etc. You may want to do this in another PR after you do all the actual entry
//  point stuff.

import type { RobotType } from '@opentrons/shared-data'
import type {
  LegacySupportLPCFlowsProps,
  LPCFlowsProps,
} from '/app/organisms/LabwarePositionCheck/LPCFlows/LPCFlows'

interface UseLPCFlowsBase {
  showLPC: boolean
  lpcProps: LPCFlowsProps | null
  isLaunchingLPC: boolean
  launchLPC: () => Promise<void>
}
interface UseLPCFlowsIdle extends UseLPCFlowsBase {
  showLPC: false
  lpcProps: null
}
interface UseLPCFlowsLaunched extends UseLPCFlowsBase {
  showLPC: true
  lpcProps: LegacySupportLPCFlowsProps
  isLaunchingLPC: false
}
export type UseLPCFlowsResult = UseLPCFlowsIdle | UseLPCFlowsLaunched

export interface UseLPCFlowsProps {
  runId: string
  robotType: RobotType
  protocolName: string | undefined
}

export function useLPCFlows({
  runId,
  robotType,
  protocolName,
}: UseLPCFlowsProps): UseLPCFlowsResult {
  const [maintenanceRunId, setMaintenanceRunId] = useState<string | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)
  const [hasCreatedLPCRun, setHasCreatedLPCRun] = useState(false)

  const deckConfig = useNotifyDeckConfigurationQuery().data
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)

  const labwareDefs = useMemo(() => {
    const labwareDefsFromCommands = getLabwareDefinitionsFromCommands(
      mostRecentAnalysis?.commands ?? []
    )
    return labwareDefsFromCommands
  }, [mostRecentAnalysis?.commands.length])

  const {
    labwareInfo,
    storedOffsets: flexOffsets,
    legacyOffsets: ot2Offsets,
  } = useLPCLabwareInfo({
    labwareDefs,
    protocolData: mostRecentAnalysis,
    robotType,
    runId,
  })

  useMonitorMaintenanceRunForDeletion({ maintenanceRunId, setMaintenanceRunId })

  const {
    createTargetedMaintenanceRun,
  } = useCreateTargetedMaintenanceRunMutation()
  const {
    createLabwareDefinition,
  } = useCreateMaintenanceRunLabwareDefinitionMutation()
  const { deleteMaintenanceRun } = useDeleteMaintenanceRunMutation()
  // TODO(jh, 01-14-25): There's no external error handing if LPC fails this series of POST requests.
  // If the server doesn't absorb this functionality for the redesign, add error handling.
  useRunLoadedLabwareDefinitions(runId, {
    onSuccess: res => {
      void Promise.all(
        res.data.map(def => {
          if ('schemaVersion' in def) {
            return createLabwareDefinition({
              maintenanceRunId: maintenanceRunId as string,
              labwareDef: def,
            })
          }
        })
      ).then(() => {
        setHasCreatedLPCRun(true)
      })
    },
    onSettled: () => {
      setIsLaunching(false)
    },
    enabled: maintenanceRunId != null,
  })

  const launchLPC = (): Promise<void> => {
    setIsLaunching(true)

    return createTargetedMaintenanceRun({
      labwareOffsets: getRelevantOffsets(robotType, ot2Offsets, flexOffsets),
    }).then(maintenanceRun => {
      setMaintenanceRunId(maintenanceRun.data.id)
    })
  }

  const handleCloseLPC = (): void => {
    if (maintenanceRunId != null) {
      deleteMaintenanceRun(maintenanceRunId, {
        onSuccess: () => {
          setMaintenanceRunId(null)
          setHasCreatedLPCRun(false)
        },
      })
    }
  }

  const showLPC =
    hasCreatedLPCRun &&
    maintenanceRunId != null &&
    protocolName != null &&
    mostRecentAnalysis != null &&
    deckConfig != null

  return showLPC
    ? {
        launchLPC,
        isLaunchingLPC: false,
        showLPC,
        lpcProps: {
          onCloseClick: handleCloseLPC,
          runId,
          robotType,
          deckConfig,
          labwareDefs,
          labwareInfo,
          mostRecentAnalysis,
          protocolName,
          maintenanceRunId,
          runRecordExistingOffsets: ot2Offsets,
        },
      }
    : { launchLPC, isLaunchingLPC: isLaunching, lpcProps: null, showLPC }
}

const RUN_REFETCH_INTERVAL = 5000

// TODO(jh, 01-02-25): Monitor for deletion behavior exists in several other flows. We should consolidate it.

// Closes the modal in case the run was deleted by the terminate activity modal on the ODD
function useMonitorMaintenanceRunForDeletion({
  maintenanceRunId,
  setMaintenanceRunId,
}: {
  maintenanceRunId: string | null
  setMaintenanceRunId: (id: string | null) => void
}): void {
  const [
    monitorMaintenanceRunForDeletion,
    setMonitorMaintenanceRunForDeletion,
  ] = useState<boolean>(false)

  // We should start checking for run deletion only after the maintenance run is created
  // and the useCurrentRun poll has returned that created id
  const { data: maintenanceRunData } = useNotifyCurrentMaintenanceRun({
    refetchInterval: RUN_REFETCH_INTERVAL,
    enabled: maintenanceRunId != null,
  })

  useEffect(() => {
    if (maintenanceRunId === null) {
      setMonitorMaintenanceRunForDeletion(false)
    } else if (
      maintenanceRunId !== null &&
      maintenanceRunData?.data.id === maintenanceRunId
    ) {
      setMonitorMaintenanceRunForDeletion(true)
    } else if (
      maintenanceRunData?.data.id !== maintenanceRunId &&
      monitorMaintenanceRunForDeletion
    ) {
      setMaintenanceRunId(null)
    }
  }, [
    maintenanceRunData?.data.id,
    maintenanceRunId,
    monitorMaintenanceRunForDeletion,
    setMaintenanceRunId,
  ])
}
