import {
  moduleInitDuringLPCCommands,
  moveToWellCommands,
  savePositionCommands,
} from './commands'

import type {
  MoveLabwareCreateCommand,
  Coordinates,
  CreateCommand,
  LabwareLocation,
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
  return offsetLocationDetails.lwModOnlyStackupDetails.reduce<
    MoveLabwareCreateCommand[]
  >((acc, component, idx, lwModOnlyLocSeqsWithIds) => {
    if (component.kind === 'onModule') {
      return acc
    } else {
      // If the previous item in the lw stackup is a module, we need to move the
      // labware on top of the module.
      const closestBeneathModuleId =
        idx > 0 && lwModOnlyLocSeqsWithIds[idx - 1].kind === 'onModule'
          ? lwModOnlyLocSeqsWithIds[idx - 1].id
          : null
      // If the previous item in the lw stackup is a lw, we need to move the
      // labware on top of the lw.
      const closestBeneathLwId =
        idx > 0 && lwModOnlyLocSeqsWithIds[idx - 1].kind === 'onLabware'
          ? lwModOnlyLocSeqsWithIds[idx - 1].id
          : null

      const buildNewLocation = (): LabwareLocation => {
        if (closestBeneathModuleId != null) {
          return { moduleId: closestBeneathModuleId }
        } else if (closestBeneathLwId != null) {
          return { labwareId: closestBeneathLwId }
        } else {
          return {
            addressableAreaName: offsetLocationDetails.addressableAreaName,
          }
        }
      }

      return [
        ...acc,
        {
          commandType: 'moveLabware',
          params: {
            labwareId: component.id,
            newLocation: buildNewLocation(),
            strategy: 'manualMoveWithoutPause',
          },
        },
      ]
    }
  }, [])
}
