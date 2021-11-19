import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { v4 as uuidv4 } from 'uuid'
import {
  HostConfig,
  createCommand, // TODO: create hook for this inside react-api-client
  RunCommandSummary,
  getCommand,
  VectorOffset,
} from '@opentrons/api-client'
import { getLabwareDisplayName } from '@opentrons/shared-data'
import { useHost, useAllCommandsQuery } from '@opentrons/react-api-client'
import { useProtocolDetails } from '../../../RunDetails/hooks'
import { useCurrentProtocolRun } from '../../../ProtocolUpload/hooks'
import { getLabwareLocation } from '../../utils/getLabwareLocation'
import { getModuleLocation } from '../../utils/getModuleLocation'
import { useSteps } from './useSteps'
import type {
  Command,
  ProtocolFile,
} from '@opentrons/shared-data/protocol/types/schemaV6'
import type { SetupCommand } from '@opentrons/shared-data/protocol/types/schemaV6/command/setup'
import type {
  Axis,
  Jog,
  Sign,
  StepSize,
} from '../../../../molecules/JogControls/types'
import type {
  LabwarePositionCheckCommand,
  LabwarePositionCheckMovementCommand,
  LabwarePositionCheckStep,
  SavePositionCommandData,
} from '../types'

export type LabwarePositionCheckUtils =
  | {
      currentCommandIndex: number
      currentStep: LabwarePositionCheckStep
      titleText: string
      isLoading: boolean
      isComplete: boolean
      beginLPC: () => void
      proceed: () => void
      jog: Jog
      ctaText: string
    }
  | { error: Error }

const IDENTITY_OFFSET = { x: 0, y: 0, z: 0 }

const useLpcCtaText = (command: LabwarePositionCheckCommand): string => {
  const { protocolData } = useProtocolDetails()
  const { t } = useTranslation('labware_position_check')
  if (command == null) return ''
  const commands = protocolData?.commands ?? []
  switch (command.commandType) {
    case 'dropTip':
      return t('confirm_position_and_return_tip')
    case 'moveToWell': {
      const labwareId = command.params.labwareId
      const labwareLocation = getLabwareLocation(labwareId, commands)
      return t('confirm_position_and_move', {
        next_slot:
          'slotName' in labwareLocation
            ? labwareLocation.slotName
            : getModuleLocation(labwareLocation.moduleId, commands),
      })
    }
    case 'thermocycler/openLid': {
      const moduleId = command.params.moduleId
      const slot = getModuleLocation(moduleId, commands)
      return t('confirm_position_and_move', {
        next_slot: slot,
      })
    }
    case 'pickUpTip': {
      return t('confirm_position_and_pick_up_tip')
    }
  }
}

export const useTitleText = (
  loading: boolean,
  command: LabwarePositionCheckMovementCommand,
  labware?: ProtocolFile<{}>['labware'],
  labwareDefinitions?: ProtocolFile<{}>['labwareDefinitions']
): string => {
  const { protocolData } = useProtocolDetails()
  const { t } = useTranslation('labware_position_check')

  if (command == null) {
    return ''
  }

  const commands = protocolData?.commands ?? []

  const labwareId = command.params.labwareId
  const labwareLocation = getLabwareLocation(labwareId, commands)
  const slot =
    'slotName' in labwareLocation
      ? labwareLocation.slotName
      : getModuleLocation(labwareLocation.moduleId, commands)

  if (loading) {
    switch (command.commandType) {
      case 'moveToWell': {
        return t('moving_to_slot_title', {
          slot,
        })
      }
      case 'pickUpTip': {
        return t('picking_up_tip_title', {
          slot,
        })
      }
      case 'dropTip': {
        return t('returning_tip_title', {
          slot,
        })
      }
    }
  } else {
    if (labware == null || labwareDefinitions == null) return ''

    const labwareDefId = labware[labwareId].definitionId
    const labwareDisplayName = getLabwareDisplayName(
      labwareDefinitions[labwareDefId]
    )
    return t('check_labware_in_slot_title', {
      labware_display_name: labwareDisplayName,
      slot,
    })
  }
}

const commandIsComplete = (status: RunCommandSummary['status']): boolean =>
  status === 'succeeded' || status === 'failed'

const createCommandData = (
  command: Command
): { commandType: string; params: Record<string, any> } => {
  if (command.commandType === 'loadLabware') {
    return {
      commandType: command.commandType,
      params: { ...command.params, labwareId: command.result?.labwareId },
    }
  }
  return { commandType: command.commandType, params: command.params }
}

const isLoadCommand = (command: Command): boolean => {
  const loadCommands: Array<SetupCommand['commandType']> = [
    'loadLabware',
    'loadLiquid',
    'loadModule',
    'loadPipette',
  ]
  // @ts-expect-error SetupCommand is more specific than Command, but the whole point of this util :)
  return loadCommands.includes(command.commandType)
}

const isTCOpenCommand = (command: Command): boolean =>
  command.commandType === 'thermocycler/openLid'

export function useLabwarePositionCheck(
  addSavePositionCommandData: (commandId: string, labwareId: string) => void,
  savePositionCommandData: SavePositionCommandData
): LabwarePositionCheckUtils {
  const [currentCommandIndex, setCurrentCommandIndex] = React.useState<number>(
    0
  )
  const [
    pendingMovementCommandData,
    setPendingMovementCommandData,
  ] = React.useState<{
    commandId: string
    pipetteId: string
    labwareId: string
    commandType: LabwarePositionCheckMovementCommand['commandType']
  } | null>(null)
  const [isLoading, setIsLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<Error | null>(null)
  const [dropTipOffset, setDropTipOffset] = React.useState<VectorOffset>(
    IDENTITY_OFFSET
  )
  const { protocolData } = useProtocolDetails()
  const host = useHost()
  const { runRecord: currentRun } = useCurrentProtocolRun()
  const LPCSteps = useSteps()

  const LPCCommands = LPCSteps.reduce<LabwarePositionCheckCommand[]>(
    (steps, currentStep) => {
      return [...steps, ...currentStep.commands]
    },
    []
  )
  // load commands come from the protocol resource
  const loadCommands =
    (protocolData?.commands.filter(isLoadCommand).map(command => {
      if (command.commandType === 'loadPipette') {
        const commandWithCommandId = {
          ...command,
          params: {
            ...command.params,
            pipetteId: command.result?.pipetteId,
          },
        }
        return commandWithCommandId
      }
      return command
    }) as Command[]) ?? []
  // TC open lid commands come from the LPC command generator
  const TCOpenCommands = LPCCommands.filter(isTCOpenCommand) ?? []
  // prepCommands will be run when a user starts LPC
  const prepCommands: Command[] = [...loadCommands, ...TCOpenCommands]
  // LPCMovementCommands will be run during the guided LPC flow
  const LPCMovementCommands: LabwarePositionCheckMovementCommand[] = LPCCommands.filter(
    (
      command: LabwarePositionCheckCommand
    ): command is LabwarePositionCheckMovementCommand =>
      command.commandType !== 'thermocycler/openLid'
  )
  const currentCommand = LPCMovementCommands[currentCommandIndex]
  const prevCommand = LPCMovementCommands[currentCommandIndex - 1]

  const currentStep = LPCSteps.find(step => {
    const matchingCommand = step.commands.find(
      command => prevCommand != null && command.id === prevCommand.id
    )
    return matchingCommand
  }) as LabwarePositionCheckStep

  const ctaText = useLpcCtaText(currentCommand)
  const robotCommands = useAllCommandsQuery(currentRun?.data?.id).data?.data
  const titleText = useTitleText(
    isLoading,
    prevCommand,
    protocolData?.labware,
    protocolData?.labwareDefinitions
  )
  if (error != null) return { error }

  const isComplete = currentCommandIndex === LPCMovementCommands.length
  const failedCommand = robotCommands?.find(
    command => command.status === 'failed'
  )
  if (failedCommand != null && error == null) {
    setError(
      new Error(
        `movement command with type ${failedCommand.commandType} and id ${failedCommand.id} failed on the robot`
      )
    )
  }
  const completedMovementCommand =
    pendingMovementCommandData != null &&
    robotCommands?.find(
      (command: RunCommandSummary) =>
        command.id === pendingMovementCommandData.commandId &&
        command.status != null &&
        commandIsComplete(command.status)
    )
  if (completedMovementCommand && pendingMovementCommandData) {
    // bail if the command failed
    if (completedMovementCommand.status === 'failed') {
      setError(
        new Error(
          `movement command id ${completedMovementCommand.id} failed on the robot`
        )
      )
    } // if the command was a pick up tip/drop tip, we dont need to log it's position
    else if (
      pendingMovementCommandData.commandType !== 'pickUpTip' &&
      pendingMovementCommandData.commandType !== 'dropTip'
    ) {
      // the movement command is complete, save its position for use later
      const savePositionCommand: Command = {
        commandType: 'savePosition',
        id: uuidv4(),
        params: { pipetteId: pendingMovementCommandData.pipetteId },
      }
      createCommand(
        host as HostConfig,
        currentRun?.data?.id as string,
        createCommandData(savePositionCommand)
      )
        .then(response => {
          const commandId = response.data.data.id
          addSavePositionCommandData(
            commandId,
            pendingMovementCommandData.labwareId
          )
        })
        .catch((e: Error) => {
          console.error(`error issuing command to robot: ${e.message}`)
          setIsLoading(false)
          setError(e)
        })
    }
    setIsLoading(false)
    setPendingMovementCommandData(null)
  }

  // (sa 11-18-2021): refactor this function after beta release
  const proceed = (): void => {
    setIsLoading(true)
    // before executing the next movement command, save the current position
    const savePositionCommand: Command = {
      commandType: 'savePosition',
      id: uuidv4(),
      params: { pipetteId: prevCommand.params.pipetteId },
    }
    createCommand(
      host as HostConfig,
      currentRun?.data?.id as string,
      createCommandData(savePositionCommand)
    )
      // add the saved command id so we can use it to query locations later
      // if the previous command was a pickup tip, we have already verified that labware's position
      .then(response => {
        if (prevCommand.commandType !== 'pickUpTip') {
          const commandId = response.data.data.id
          addSavePositionCommandData(commandId, prevCommand.params.labwareId)
        }
        // later in the promise chain we may need to incorporate in flight offsets into
        // pickup tip/drop tip commands, so we need to prepare those offset vectors

        // if this is the first labware that we are checking, no in flight offsets have been applied
        // return identity offsets and move on, they will no get used
        if (savePositionCommandData[currentCommand.params.labwareId] == null) {
          const positions = Promise.resolve([IDENTITY_OFFSET, IDENTITY_OFFSET])
          return positions
        }

        const prevSavePositionCommand = getCommand(
          host as HostConfig,
          currentRun?.data?.id as string,
          response.data.data.id
        )

        const initialSavePositionCommandId =
          savePositionCommandData[currentCommand.params.labwareId][0]
        const initialSavePositionCommand = getCommand(
          host as HostConfig,
          currentRun?.data?.id as string,
          initialSavePositionCommandId
        )
        const offsetFromPrevSavePositionCommand: Promise<VectorOffset> = prevSavePositionCommand.then(
          response => {
            return response.data.data.result.position
          }
        )
        const offsetFromInitialSavePositionCommand: Promise<VectorOffset> = initialSavePositionCommand.then(
          response => {
            return response.data.data.result.position
          }
        )
        const positions = Promise.all([
          offsetFromPrevSavePositionCommand,
          offsetFromInitialSavePositionCommand,
        ])
        return positions
      })
      .then(
        ([
          offsetFromPrevSavePositionCommand,
          offsetFromInitialSavePositionCommand,
        ]) => {
          // if the next command to execute is a pick up tip, we need to make sure
          // we pick up from the offset the user specified
          if (currentCommand.commandType === 'pickUpTip') {
            const {
              x: firstX,
              y: firstY,
              z: firstZ,
            } = offsetFromInitialSavePositionCommand
            const {
              x: secondX,
              y: secondY,
              z: secondZ,
            } = offsetFromPrevSavePositionCommand
            const offset = {
              x: secondX - firstX,
              y: secondY - firstY,
              z: secondZ - firstZ,
            }

            // save the offset to be used later by dropTip
            setDropTipOffset(offset)

            const wellLocation =
              currentCommand.params.wellLocation != null
                ? {
                    ...currentCommand.params.wellLocation,
                    offset,
                  }
                : { offset }
            currentCommand.params.wellLocation = wellLocation
          } else if (currentCommand.commandType === 'dropTip') {
            // apply in flight offsets to the drop tip command
            const wellLocation =
              currentCommand.params.wellLocation != null
                ? {
                    ...currentCommand.params.wellLocation,
                    offset: dropTipOffset,
                  }
                : { offset: dropTipOffset }
            currentCommand.params.wellLocation = wellLocation
          }
          // execute the movement command
          return createCommand(
            host as HostConfig,
            currentRun?.data?.id as string,
            createCommandData(currentCommand)
          )
        }
      )
      .then(response => {
        const commandId = response.data.data.id
        const pipetteId = currentCommand.params.pipetteId
        const labwareId: string = currentCommand.params.labwareId
        const commandType = currentCommand.commandType
        setPendingMovementCommandData({
          commandId,
          pipetteId,
          labwareId,
          commandType,
        })
        setCurrentCommandIndex(currentCommandIndex + 1)
      })
      .catch((e: Error) => {
        console.error(`error issuing command to robot: ${e.message}`)
        setError(e)
      })
  }

  const beginLPC = (): void => {
    setIsLoading(true)
    // execute prep commands
    prepCommands.forEach(prepCommand => {
      createCommand(
        host as HostConfig,
        currentRun?.data?.id as string,
        createCommandData(prepCommand)
      ).catch((e: Error) => {
        console.error(`error issuing command to robot: ${e.message}`)
        setError(e)
      })
    })
    // issue first movement command
    createCommand(
      host as HostConfig,
      currentRun?.data?.id as string,
      createCommandData(currentCommand)
    )
      .then(response => {
        const commandId = response.data.data.id
        setPendingMovementCommandData({
          commandId,
          labwareId: currentCommand.params.labwareId,
          pipetteId: currentCommand.params.pipetteId,
          commandType: currentCommand.commandType,
        })
        setCurrentCommandIndex(currentCommandIndex + 1)
      })
      .catch((e: Error) => {
        console.error(`error issuing command to robot: ${e.message}`)
        setError(e)
      })
  }

  const jog = (axis: Axis, dir: Sign, step: StepSize): void => {
    const data = {
      commandType: 'moveRelative',
      params: {
        pipetteId: currentCommand.params.pipetteId,
        distance: step * dir,
        axis,
      },
    }

    createCommand(
      host as HostConfig,
      currentRun?.data?.id as string,
      data
    ).catch((e: Error) => {
      setError(e)
      console.error(`error issuing jog command: ${e.message}`)
    })
  }

  return {
    currentCommandIndex,
    currentStep,
    beginLPC,
    proceed,
    jog,
    ctaText,
    isComplete,
    titleText,
    isLoading,
  }
}
