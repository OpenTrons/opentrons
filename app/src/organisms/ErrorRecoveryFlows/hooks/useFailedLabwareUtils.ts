import { useEffect, useMemo, useState } from 'react'
import without from 'lodash/without'
import { useTranslation } from 'react-i18next'

import {
  FLEX_ROBOT_TYPE,
  getAllLabwareDefs,
  getLabwareDisplayName,
  getLoadedLabwareDefinitionsByUri,
} from '@opentrons/shared-data'
import type {
  DisplayLocationSlotOnlyParams,
  WellGroup,
} from '@opentrons/components'
import type { CommandsData, PipetteData, Run } from '@opentrons/api-client'
import type {
  LabwareDefinition2,
  LoadedLabware,
  PickUpTipRunTimeCommand,
  AspirateRunTimeCommand,
  DispenseRunTimeCommand,
  LiquidProbeRunTimeCommand,
  MoveLabwareRunTimeCommand,
  FlexStackerRetrieveRunTimeCommand,
  LabwareLocation,
  LoadedModule,
} from '@opentrons/shared-data'

import {
  getLoadedLabware,
  getLabwareDisplayLocation,
} from '@opentrons/components'
import { ERROR_KINDS } from '../constants'
import { getErrorKind } from '../utils'
import type { ErrorRecoveryFlowsProps } from '..'
import type { FailedCommandBySource } from './useRetainedFailedCommandBySource'
import type { ErrorKind } from '../types'

interface UseFailedLabwareUtilsProps {
  failedCommand: FailedCommandBySource | null
  protocolAnalysis: ErrorRecoveryFlowsProps['protocolAnalysis']
  failedPipetteInfo: PipetteData | null
  runCommands?: CommandsData
  runRecord?: Run
}

interface RelevantFailedLabwareLocations {
  displayNameCurrentLoc: string
  displayNameNewLoc: string | null
  currentLoc: LabwareLocation | null
  newLoc: LabwareLocation | null
}

export type UseFailedLabwareUtilsResult = UseTipSelectionUtilsResult & {
  /* The name of the labware relevant to the failed command, if any.  */
  failedLabwareName: string | null
  /* Info for the labware relevant to the failed command, if any. */
  failedLabware: LoadedLabware | null
  /* The name of the well(s) or tip location(s), if any. */
  relevantWellName: string | null
  /* The user-content nickname of the failed labware, if any */
  failedLabwareNickname: string | null
  /* Details relating to the labware location. */
  failedLabwareLocations: RelevantFailedLabwareLocations
  /* Details relating to the labware quantity in the stacker. */
  labwareQuantity: string | null
}

/** Utils for labware relating to the failedCommand.
 *
 * NOTE: What constitutes "relevant labware" varies depending on the errorKind.
 * For overpressure errors, the relevant labware is the tip rack from which the pipette picked up the tip.
 * For no liquid detected errors, the relevant labware is the well in which no liquid was detected.
 * For stacker errors the labware is the labware set by flexStacker/setStoredLabwre.
 */
export function useFailedLabwareUtils({
  failedCommand,
  protocolAnalysis,
  failedPipetteInfo,
  runCommands,
  runRecord,
}: UseFailedLabwareUtilsProps): UseFailedLabwareUtilsResult {
  const failedCommandByRunRecord = failedCommand?.byRunRecord ?? null
  const errorKind = getErrorKind(failedCommand)

  const recentRelevantFailedLabwareCmd = useMemo(
    () =>
      getRelevantFailedLabwareCmdFrom({
        failedCommand,
        runCommands,
      }),
    [failedCommandByRunRecord?.key, runCommands?.meta.totalLength]
  )

  const tipSelectionUtils = useTipSelectionUtils(recentRelevantFailedLabwareCmd)

  const failedLabwareDetails = useMemo(
    () =>
      getFailedCmdRelevantLabware(
        protocolAnalysis,
        recentRelevantFailedLabwareCmd,
        errorKind,
        runRecord
      ),
    [protocolAnalysis?.id, recentRelevantFailedLabwareCmd?.key, errorKind]
  )

  const failedLabware = useMemo(
    () => getFailedLabware(recentRelevantFailedLabwareCmd, runRecord),
    [recentRelevantFailedLabwareCmd?.key]
  )

  const relevantWellName = getRelevantWellName(
    failedPipetteInfo,
    recentRelevantFailedLabwareCmd
  )

  const failedLabwareLocations = useRelevantFailedLwLocations({
    failedLabware,
    failedCommandByRunRecord,
    runRecord,
    errorKind,
  })

  const labwareQuantity = getFailedLabwareQuantity(
    runCommands,
    recentRelevantFailedLabwareCmd,
    errorKind
  )

  return {
    ...tipSelectionUtils,
    failedLabwareName: failedLabwareDetails?.name ?? null,
    failedLabware,
    relevantWellName,
    failedLabwareNickname: failedLabwareDetails?.nickname ?? null,
    failedLabwareLocations,
    labwareQuantity,
  }
}

type FailedCommandRelevantLabware =
  | Omit<AspirateRunTimeCommand, 'result'>
  | Omit<DispenseRunTimeCommand, 'result'>
  | Omit<LiquidProbeRunTimeCommand, 'result'>
  | Omit<PickUpTipRunTimeCommand, 'result'>
  | Omit<MoveLabwareRunTimeCommand, 'result'>
  | Omit<FlexStackerRetrieveRunTimeCommand, 'result'>
  | null

interface RelevantFailedLabwareCmd {
  failedCommand: FailedCommandBySource | null
  runCommands?: CommandsData
}

// Return the actual command that contains the info relating to the relevant labware.
export function getRelevantFailedLabwareCmdFrom({
  failedCommand,
  runCommands,
}: RelevantFailedLabwareCmd): FailedCommandRelevantLabware {
  const failedCommandByRunRecord = failedCommand?.byRunRecord ?? null
  const errorKind = getErrorKind(failedCommand)

  switch (errorKind) {
    case ERROR_KINDS.NO_LIQUID_DETECTED:
      return failedCommandByRunRecord as LiquidProbeRunTimeCommand
    case ERROR_KINDS.OVERPRESSURE_PREPARE_TO_ASPIRATE:
    case ERROR_KINDS.OVERPRESSURE_WHILE_ASPIRATING:
    case ERROR_KINDS.OVERPRESSURE_WHILE_DISPENSING:
    case ERROR_KINDS.STALL_OR_COLLISION:
      return getRelevantPickUpTipCommand(failedCommandByRunRecord, runCommands)
    case ERROR_KINDS.GRIPPER_ERROR:
      return failedCommandByRunRecord as MoveLabwareRunTimeCommand
    case ERROR_KINDS.STALL_WHILE_STACKING:
      return failedCommandByRunRecord as FlexStackerRetrieveRunTimeCommand
    default:
      console.error(
        `useFailedLabwareUtils: No labware associated with error kind ${errorKind}. Handle case explicitly.`
      )
      return null
  }
}

// Returns the most recent pickUpTip command for the pipette used in the failed command, if any.
function getRelevantPickUpTipCommand(
  failedCommandByRunRecord: FailedCommandBySource['byRunRecord'] | null,
  runCommands?: CommandsData
): Omit<PickUpTipRunTimeCommand, 'result'> | null {
  if (
    failedCommandByRunRecord == null ||
    runCommands == null ||
    !('wellName' in failedCommandByRunRecord.params) ||
    !('pipetteId' in failedCommandByRunRecord.params)
  ) {
    return null
  }

  const failedCmdPipetteId = failedCommandByRunRecord.params.pipetteId

  // Reverse iteration is faster as long as # recovery commands < # run commands.
  const failedCommandIdx = runCommands.data.findLastIndex(
    command => command.key === failedCommandByRunRecord.key
  )

  const recentPickUpTipCmd = runCommands.data
    .slice(0, failedCommandIdx)
    .findLast(
      command =>
        command.commandType === 'pickUpTip' &&
        command.params.pipetteId === failedCmdPipetteId
    )

  if (recentPickUpTipCmd == null) {
    return null
  } else {
    return recentPickUpTipCmd as Omit<PickUpTipRunTimeCommand, 'result'>
  }
}

interface UseTipSelectionUtilsResult {
  /* Always returns null if the relevant labware is not relevant to tip pick up. */
  selectedTipLocations: WellGroup | null
  tipSelectorDef: LabwareDefinition2
  selectTips: (tipGroup: WellGroup) => void
  deselectTips: (locations: string[]) => void
  areTipsSelected: boolean
}

// Utils for initializing and interacting with the Tip Selector component.
// Note: if the relevant failed labware command is not associated with tips, these utils effectively return `null`.
function useTipSelectionUtils(
  recentRelevantFailedLabwareCmd: FailedCommandRelevantLabware
): UseTipSelectionUtilsResult {
  const [selectedLocs, setSelectedLocs] = useState<WellGroup | null>(null)

  // Note that while other commands may have a wellName associated with them,
  // we are only interested in wells for the purposes of tip picking up.
  // Support state updates if the underlying well data changes, since this data is lazily retrieved and may change shortly
  // after Error Recovery launches.
  const initialWellName =
    recentRelevantFailedLabwareCmd != null &&
    recentRelevantFailedLabwareCmd.commandType === 'pickUpTip'
      ? recentRelevantFailedLabwareCmd.params.wellName
      : null
  useEffect(() => {
    if (
      recentRelevantFailedLabwareCmd != null &&
      recentRelevantFailedLabwareCmd.commandType === 'pickUpTip'
    ) {
      setSelectedLocs({
        [recentRelevantFailedLabwareCmd.params.wellName]: null,
      })
    }
  }, [initialWellName])

  const deselectTips = (locations: string[]): void => {
    setSelectedLocs(prevLocs =>
      without(Object.keys(prevLocs as WellGroup), ...locations).reduce(
        (acc, well) => {
          return { ...acc, [well]: null }
        },
        {}
      )
    )
  }

  const selectTips = (tipGroup: WellGroup): void => {
    setSelectedLocs(() => ({ ...tipGroup }))
  }

  // Use this labware to represent all tip racks for manual tip selection.
  const tipSelectorDef = useMemo(
    () => getAllLabwareDefs().thermoscientificnunc96Wellplate1300UlV1,
    []
  )

  const areTipsSelected =
    selectedLocs != null && Object.keys(selectedLocs).length > 0

  return {
    selectedTipLocations: selectedLocs,
    tipSelectorDef,
    selectTips,
    deselectTips,
    areTipsSelected,
  }
}

export function getFailedLabwareQuantity(
  runCommands: CommandsData | undefined,
  recentRelevantFailedLabwareCmd: FailedCommandRelevantLabware,
  errorKind: ErrorKind
): string | null {
  if (errorKind === ERROR_KINDS.STALL_WHILE_STACKING && runCommands != null) {
    const failedCommandIndex = runCommands?.data.findIndex(
      x => x.id === recentRelevantFailedLabwareCmd?.id
    )
    const commandsBeforefailedCmd = runCommands?.data.slice(
      0,
      failedCommandIndex ?? 0
    )
    const setStoredLabwareLast = commandsBeforefailedCmd?.findLast(
      cmd => cmd.commandType === 'flexStacker/setStoredLabware'
    )
    const setStoredLabwareLastIndex = commandsBeforefailedCmd?.findLastIndex(
      cmd => cmd.commandType === 'flexStacker/setStoredLabware'
    )
    const itemsToCheck = commandsBeforefailedCmd?.slice(
      setStoredLabwareLastIndex ?? 0,
      failedCommandIndex ?? 0
    )

    if (
      setStoredLabwareLast != null &&
      'initialCount' in setStoredLabwareLast.params
    ) {
      const total = setStoredLabwareLast?.params.initialCount ?? 0
      const retreiveCmds =
        itemsToCheck?.filter(cmd => cmd.commandType === 'flexStacker/retrieve')
          .length ?? 0
      const storeCmds =
        itemsToCheck?.filter(cmd => cmd.commandType === 'flexStacker/store')
          .length ?? 0
      return 'Quantity: ' + (total - retreiveCmds + storeCmds)
    } else {
      return 'Quantity: 0'
    }
  }
  return null
}

// Get the name of the relevant labware relevant to the failed command, if any.
export function getFailedCmdRelevantLabware(
  protocolAnalysis: ErrorRecoveryFlowsProps['protocolAnalysis'],
  recentRelevantFailedLabwareCmd: FailedCommandRelevantLabware,
  errorKind: ErrorKind,
  runRecord?: Run
): { name: string; nickname: string | null } | null {
  const lwDefsByURI = getLoadedLabwareDefinitionsByUri(
    protocolAnalysis?.commands ?? []
  )
  let labwareNickname, failedLWURI
  switch (errorKind) {
    case ERROR_KINDS.STALL_WHILE_STACKING:
      for (const key in lwDefsByURI) {
        if (lwDefsByURI.hasOwnProperty(key)) {
          labwareNickname = getLabwareDisplayName(lwDefsByURI[key])
          break
        }
      }
      return {
        name: labwareNickname ?? '',
        nickname: labwareNickname ?? null,
      }
    default:
      labwareNickname =
        protocolAnalysis != null
          ? getLoadedLabware(
              protocolAnalysis.labware,
              recentRelevantFailedLabwareCmd?.params.labwareId || ''
            )?.displayName ?? null
          : null
      failedLWURI = runRecord?.data.labware.find(
        labware =>
          labware.id === recentRelevantFailedLabwareCmd?.params.labwareId
      )?.definitionUri
      if (
        failedLWURI != null &&
        Object.keys(lwDefsByURI).includes(failedLWURI)
      ) {
        return {
          name: getLabwareDisplayName(lwDefsByURI[failedLWURI]),
          nickname: labwareNickname,
        }
      } else {
        return null
      }
  }
}

// Get the relevant labware related to the failed command, if any.
function getFailedLabware(
  recentRelevantPickUpTipCmd: FailedCommandRelevantLabware,
  runRecord?: Run
): LoadedLabware | null {
  return (
    runRecord?.data.labware.find(
      lw => lw.id === recentRelevantPickUpTipCmd?.params.labwareId
    ) ?? null
  )
}

// Return the name of the well(s) related to the failed command, if any.
export function getRelevantWellName(
  failedPipetteInfo: UseFailedLabwareUtilsProps['failedPipetteInfo'],
  recentRelevantPickUpTipCmd: FailedCommandRelevantLabware
): string {
  if (
    failedPipetteInfo == null ||
    recentRelevantPickUpTipCmd == null ||
    !('wellName' in recentRelevantPickUpTipCmd.params)
  ) {
    return ''
  }

  const channels = failedPipetteInfo.data.channels
  const wellName = recentRelevantPickUpTipCmd.params.wellName
  const wellNameNumber = wellName.slice(1)

  if (channels === 8) {
    return `A${wellNameNumber} - H${wellNameNumber}`
  }
  // Well names are not used for the 96-channel currently.
  else {
    return wellName
  }
}

export type GetRelevantLwLocationsParams = Pick<
  UseFailedLabwareUtilsProps,
  'runRecord'
> & {
  failedLabware: UseFailedLabwareUtilsResult['failedLabware']
  failedCommandByRunRecord: FailedCommandBySource['byRunRecord'] | null
  errorKind: ErrorKind
}

export function useRelevantFailedLwLocations({
  failedLabware,
  failedCommandByRunRecord,
  runRecord,
  errorKind,
}: GetRelevantLwLocationsParams): RelevantFailedLabwareLocations {
  const { t } = useTranslation('protocol_command_text')

  const loadedModules = runRecord?.data?.modules ?? []
  const BASE_DISPLAY_PARAMS: Omit<DisplayLocationSlotOnlyParams, 'location'> = {
    loadedLabwares: runRecord?.data?.labware ?? [],
    loadedModules,
    robotType: FLEX_ROBOT_TYPE,
    t,
    detailLevel: 'slot-only',
    isOnDevice: false, // Always return the "slot XYZ" copy, which is the desktop copy.
  }

  let location
  switch (errorKind) {
    case ERROR_KINDS.STALL_WHILE_STACKING:
      if (
        failedCommandByRunRecord?.params != null &&
        'moduleId' in failedCommandByRunRecord?.params
      ) {
        location = {
          moduleId: failedCommandByRunRecord?.params.moduleId,
        }
      } else {
        location = null
      }
      break
    default:
      location = failedLabware?.location ?? null
      break
  }

  const displayNameCurrentLoc = getLabwareDisplayLocation({
    ...BASE_DISPLAY_PARAMS,
    location: location,
  })

  const getNewLocation = (): Pick<
    RelevantFailedLabwareLocations,
    'displayNameNewLoc' | 'newLoc'
  > => {
    switch (failedCommandByRunRecord?.commandType) {
      case 'moveLabware':
        return {
          displayNameNewLoc: getLabwareDisplayLocation({
            ...BASE_DISPLAY_PARAMS,
            location: failedCommandByRunRecord.params.newLocation,
          }),
          newLoc: failedCommandByRunRecord.params.newLocation,
        }
      case 'flexStacker/retrieve':
      case 'flexStacker/store':
        return {
          displayNameNewLoc: getLabwareDisplayLocation({
            ...BASE_DISPLAY_PARAMS,
            location:
              loadedModules.find(
                (m: LoadedModule) =>
                  m.id === failedCommandByRunRecord?.params.moduleId
              )?.location ?? 'offDeck',
          }),
          newLoc: {
            moduleId: failedCommandByRunRecord?.params.moduleId,
          },
        }
      default:
        return {
          displayNameNewLoc: null,
          newLoc: null,
        }
    }
  }

  return {
    displayNameCurrentLoc,
    currentLoc: failedLabware?.location ?? null,
    ...getNewLocation(),
  }
}
