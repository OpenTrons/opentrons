import { useEffect, useMemo, useState } from 'react'

import { getLabwareDefinitionsFromCommands } from '@opentrons/components'
import {
  useCreateMaintenanceRunLabwareDefinitionMutation,
  useDeleteMaintenanceRunMutation,
  useRunLoadedLabwareDefinitions,
} from '@opentrons/react-api-client'
import { FLEX_ROBOT_TYPE } from '@opentrons/shared-data'

import {
  useCreateTargetedMaintenanceRunMutation,
  useMostRecentCompletedAnalysis,
  useNotifyRunQuery,
} from '/app/resources/runs'
import { useNotifyCurrentMaintenanceRun } from '/app/resources/maintenance_runs'
import { useNotifyDeckConfigurationQuery } from '/app/resources/deck_configuration'
import { getRelevantOffsets } from '/app/organisms/LabwarePositionCheck/LPCFlows/utils'
import {
  useLPCLabwareInfo,
  useUpdateLPCStore,
  useCompatibleAnalysis,
} from './hooks'
import { useClonedRunOffsetStaleTimestamp } from './useClonedRunOffsetStaleTimestamp'

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

  // TOME TODO: Check that offset requests don't happen if we are looking at a historical
  // run. Make sure run setup is disabled, too.
  const isFlex = robotType === FLEX_ROBOT_TYPE
  const deckConfig = useNotifyDeckConfigurationQuery().data
  const { data: runRecord } = useNotifyRunQuery(runId)
  const mostRecentAnalysis = useMostRecentCompletedAnalysis(runId)
  const compatibleFlexAnalysis = useCompatibleAnalysis(
    runId,
    runRecord,
    mostRecentAnalysis,
    isFlex
  )
  const compatibleRobotAnalysis = isFlex
    ? compatibleFlexAnalysis
    : mostRecentAnalysis

  const labwareDefs = useMemo(() => {
    const labwareDefsFromCommands = getLabwareDefinitionsFromCommands(
      compatibleRobotAnalysis?.commands ?? []
    )
    return labwareDefsFromCommands
  }, [compatibleRobotAnalysis?.commands.length])

  const {
    labwareInfo,
    storedOffsets: flexOffsets,
    legacyOffsets: ot2Offsets,
    searchLwOffsetsParams: flexOffsetSearchParams,
  } = useLPCLabwareInfo({
    labwareDefs,
    protocolData: compatibleRobotAnalysis,
    robotType,
    runId,
  })

  const lastFreshOffsetRunTs = useClonedRunOffsetStaleTimestamp(
    runRecord,
    flexOffsetSearchParams,
    isFlex
  )

  useUpdateLPCStore({
    runId,
    analysis: compatibleRobotAnalysis,
    protocolName,
    maintenanceRunId,
    labwareDefs,
    labwareInfo,
    deckConfig,
    robotType,
    lastFreshOffsetRunTs,
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
    // Avoid accidentally creating several maintenance runs if a request is ongoing.
    if (!isLaunching) {
      setIsLaunching(true)
      const labwareOffsets = getRelevantOffsets(
        robotType,
        ot2Offsets,
        flexOffsets ?? []
      )
      const createRunData = labwareOffsets != null ? { labwareOffsets } : {}

      return createTargetedMaintenanceRun(createRunData).then(
        maintenanceRun => {
          setMaintenanceRunId(maintenanceRun.data.id)
        }
      )
    } else {
      console.warn('Attempted to launch LPC while already launching.')
      return Promise.resolve()
    }
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
    compatibleRobotAnalysis != null &&
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
          analysis: compatibleRobotAnalysis,
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
