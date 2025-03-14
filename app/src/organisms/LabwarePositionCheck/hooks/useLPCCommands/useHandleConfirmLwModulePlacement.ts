import {
  moduleInitDuringLPCCommands,
  moveToWellCommands,
  savePositionCommands,
} from './commands'

import type {
  MoveLabwareCreateCommand,
  Coordinates,
  CreateCommand,
} from '@opentrons/shared-data'
import type { VectorOffset } from '@opentrons/api-client'
import type { UseLPCCommandWithChainRunChildProps } from './types'
import type { OffsetLocationDetails } from '/app/redux/protocol-runs'

export interface UseHandleConfirmPlacementProps
  extends UseLPCCommandWithChainRunChildProps {
  setErrorMessage: (msg: string | null) => void
}

export interface UseHandleConfirmPlacementResult {
  /* Initiate commands to finalize pre-protocol run conditions for specific modules
   before moving the pipette to the initial LPC position. */
  handleConfirmLwModulePlacement: (
    offsetLocationDetails: OffsetLocationDetails,
    pipetteId: string,
    initialVectorOffset?: VectorOffset | null
  ) => Promise<Coordinates>
}

export function useHandleConfirmLwModulePlacement({
  chainLPCCommands,
  mostRecentAnalysis,
  setErrorMessage,
}: UseHandleConfirmPlacementProps): UseHandleConfirmPlacementResult {
  const handleConfirmLwModulePlacement = (
    offsetLocationDetails: OffsetLocationDetails,
    pipetteId: string,
    initialVectorOffset?: VectorOffset | null
  ): Promise<Coordinates> => {
    const confirmCommands: CreateCommand[] = [
      ...buildMoveLabwareCommand(offsetLocationDetails),
      ...moduleInitDuringLPCCommands(mostRecentAnalysis),
      ...moveToWellCommands(
        offsetLocationDetails,
        pipetteId,
        initialVectorOffset
      ),
      ...savePositionCommands(pipetteId),
    ]

    return chainLPCCommands(confirmCommands, false).then(responses => {
      const finalResponse = responses[responses.length - 1]
      if (
        finalResponse.data.commandType === 'savePosition' &&
        finalResponse.data.result != null
      ) {
        const { position } = finalResponse.data.result

        return Promise.resolve(position)
      } else {
        setErrorMessage(
          'CheckItem failed to save position for initial placement.'
        )
        return Promise.reject(
          new Error('CheckItem failed to save position for initial placement.')
        )
      }
    })
  }

  return { handleConfirmLwModulePlacement }
}

function buildMoveLabwareCommand(
  offsetLocationDetails: OffsetLocationDetails
): MoveLabwareCreateCommand[] {
  const { labwareId, moduleId, adapterId, slotName } = offsetLocationDetails

  const locationSpecificSlotName = slotName as string

  const newLocationLabware =
    moduleId != null ? { moduleId } : { slotName: locationSpecificSlotName }
  const newLocationAdapter =
    adapterId != null
      ? { labwareId: adapterId }
      : { slotName: locationSpecificSlotName }

  if (adapterId != null) {
    return [
      {
        commandType: 'moveLabware' as const,
        params: {
          labwareId: adapterId,
          newLocation: newLocationLabware,
          strategy: 'manualMoveWithoutPause',
        },
      },
      {
        commandType: 'moveLabware' as const,
        params: {
          labwareId,
          newLocation: newLocationAdapter,
          strategy: 'manualMoveWithoutPause',
        },
      },
    ]
  } else {
    return [
      {
        commandType: 'moveLabware' as const,
        params: {
          labwareId,
          newLocation: newLocationLabware,
          strategy: 'manualMoveWithoutPause',
        },
      },
    ]
  }
}
