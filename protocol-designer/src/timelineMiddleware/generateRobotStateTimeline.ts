import {
  dropTipInTrash,
  dropTipInWasteChute,
  curryCommandCreator,
  dropTip,
  reduceCommandCreators,
  commandCreatorsTimeline,
  getPipetteIdFromCCArgs,
} from '@opentrons/step-generation'
import { commandCreatorFromStepArgs } from '../file-data/helpers'
import type { StepArgsAndErrorsById } from '../steplist/types'
import type * as StepGeneration from '@opentrons/step-generation'
import type { CutoutId } from '@opentrons/shared-data'

export interface GenerateRobotStateTimelineArgs {
  allStepArgsAndErrors: StepArgsAndErrorsById
  orderedStepIds: string[]
  initialRobotState: StepGeneration.RobotState
  invariantContext: StepGeneration.InvariantContext
}
export const generateRobotStateTimeline = (
  args: GenerateRobotStateTimelineArgs
): StepGeneration.Timeline => {
  const {
    allStepArgsAndErrors,
    orderedStepIds,
    initialRobotState,
    invariantContext,
  } = args
  const continuousStepArgs = orderedStepIds.reduce<
    StepGeneration.CommandCreatorArgs[]
  >((acc, stepId) => {
    const { stepArgs } = allStepArgsAndErrors?.[stepId]
    return stepArgs != null ? [...acc, stepArgs] : acc
  }, [])
  const curriedCommandCreators = continuousStepArgs.reduce(
    (
      acc: StepGeneration.CurriedCommandCreator[],
      args: StepGeneration.CommandCreatorArgs,
      stepIndex
    ): StepGeneration.CurriedCommandCreator[] => {
      const curriedCommandCreator = commandCreatorFromStepArgs(args)

      if (curriedCommandCreator === null) {
        // unsupported command creator in args.commandCreatorFnName
        return acc
      }

      // Drop tips eagerly, per pipette
      //
      // - If we don't have a 'changeTip: never' step for this pipette in the future,
      // we know the current tip(s) aren't going to be reused, so we can drop them
      // immediately after the current step is done.
      const pipetteId = getPipetteIdFromCCArgs(args)
      const dropTipLocation =
        'dropTipLocation' in args ? args.dropTipLocation : null

      //  assume that whenever we have a pipetteId we also have a dropTipLocation
      if (pipetteId != null && dropTipLocation != null) {
        const nextStepArgsForPipette = continuousStepArgs
          .slice(stepIndex + 1)
          .find(
            stepArgs => 'pipette' in stepArgs && stepArgs.pipette === pipetteId
          )
        const willReuseTip =
          nextStepArgsForPipette != null &&
          'changeTip' in nextStepArgsForPipette &&
          nextStepArgsForPipette.changeTip === 'never'

        const isWasteChute =
          invariantContext.wasteChuteEntities[dropTipLocation] != null
        const isTrashBin =
          invariantContext.trashBinEntities[dropTipLocation] != null
        let dropTipCommands = [
          curryCommandCreator(dropTip, {
            pipette: pipetteId,
            dropTipLocation,
          }),
        ]
        if (isWasteChute) {
          dropTipCommands = [
            curryCommandCreator(dropTipInWasteChute, {
              pipetteId,
              wasteChuteId:
                invariantContext.wasteChuteEntities[dropTipLocation].id,
            }),
          ]
        }

        if (isTrashBin) {
          const trashLocation =
            invariantContext.trashBinEntities[dropTipLocation].location
          dropTipCommands = [
            curryCommandCreator(dropTipInTrash, {
              pipetteId,
              trashLocation: trashLocation as CutoutId,
            }),
          ]
        }

        if (!willReuseTip) {
          return [
            ...acc,
            (_invariantContext, _prevRobotState) =>
              reduceCommandCreators(
                [curriedCommandCreator, ...dropTipCommands],
                _invariantContext,
                _prevRobotState
              ),
          ]
        }
      }

      return [...acc, curriedCommandCreator]
    },
    []
  )
  const timeline = commandCreatorsTimeline(
    curriedCommandCreators,
    invariantContext,
    initialRobotState
  )

  return timeline
}
