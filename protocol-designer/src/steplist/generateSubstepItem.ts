import cloneDeep from 'lodash/cloneDeep'
import range from 'lodash/range'
import mapValues from 'lodash/mapValues'
import isEmpty from 'lodash/isEmpty'
import {
  consolidate,
  distribute,
  transfer,
  mix,
  curryCommandCreator,
} from '@opentrons/step-generation'
import { substepTimeline } from './substepTimeline'
import * as steplistUtils from './utils'
import { THERMOCYCLER_PROFILE, THERMOCYCLER_STATE } from '../constants'
import type {
  CurriedCommandCreator,
  InvariantContext,
  RobotState,
  ConsolidateArgs,
  DistributeArgs,
  MixArgs,
  TransferArgs,
} from '@opentrons/step-generation'
import type { StepIdType } from '../form-types'
import type {
  NamedIngred,
  StepArgsAndErrors,
  StepItemSourceDestRow,
  SourceDestSubstepItem,
  SubstepItemData,
  SubstepTimelineFrame,
  LabwareNamesByModuleId,
} from './types'
export type GetIngreds = (labware: string, well: string) => NamedIngred[]
type TransferLikeArgs =
  | ConsolidateArgs
  | DistributeArgs
  | TransferArgs
  | MixArgs

function getCommandCreatorForTransferlikeSubsteps(
  stepArgs: TransferLikeArgs
): CurriedCommandCreator | null {
  // Call appropriate command creator with the validateForm fields.
  // Disable any mix args so those aspirate/dispenses don't show up in substeps
  if (stepArgs.commandCreatorFnName === 'transfer') {
    const commandCallArgs = {
      ...stepArgs,
      // TODO(IL, 2020-02-24): Flow is refusing to infer these when we
      // spread `...stepArgs` above, so for now, they have to be redundantly explicit
      blowoutFlowRateUlSec: stepArgs.blowoutFlowRateUlSec,
      blowoutLocation: stepArgs.blowoutLocation,
      blowoutOffsetFromTopMm: stepArgs.blowoutOffsetFromTopMm,
      commandCreatorFnName: stepArgs.commandCreatorFnName,
      destWells: stepArgs.destWells,
      sourceWells: stepArgs.sourceWells,
      // set special values for substeps
      mixBeforeAspirate: null,
      mixInDestination: null,
      preWetTip: false,
      tiprack: stepArgs.tipRack,
    }
    return curryCommandCreator(transfer, commandCallArgs)
  } else if (stepArgs.commandCreatorFnName === 'distribute') {
    const commandCallArgs = {
      ...stepArgs,
      // TODO(IL, 2020-02-24): Flow is refusing to infer these when we
      // spread `...stepArgs` above, so for now, they have to be redundantly explicit
      blowoutFlowRateUlSec: stepArgs.blowoutFlowRateUlSec,
      blowoutOffsetFromTopMm: stepArgs.blowoutOffsetFromTopMm,
      commandCreatorFnName: stepArgs.commandCreatorFnName,
      destWells: stepArgs.destWells,
      disposalVolume: stepArgs.disposalVolume,
      sourceWell: stepArgs.sourceWell,
      // set special values for substeps
      mixBeforeAspirate: null,
      preWetTip: false,
      tiprack: stepArgs.tipRack,
    }
    return curryCommandCreator(distribute, commandCallArgs)
  } else if (stepArgs.commandCreatorFnName === 'consolidate') {
    const commandCallArgs = {
      ...stepArgs,
      // TODO(IL, 2020-02-24): Flow is refusing to infer these when we
      // spread `...stepArgs` above, so for now, they have to be redundantly explicit
      blowoutFlowRateUlSec: stepArgs.blowoutFlowRateUlSec,
      blowoutLocation: stepArgs.blowoutLocation,
      blowoutOffsetFromTopMm: stepArgs.blowoutOffsetFromTopMm,
      commandCreatorFnName: stepArgs.commandCreatorFnName,
      destWell: stepArgs.destWell,
      sourceWells: stepArgs.sourceWells,
      // set special values for substeps
      mixFirstAspirate: null,
      mixInDestination: null,
      preWetTip: false,
      tiprack: stepArgs.tipRack,
    }
    return curryCommandCreator(consolidate, commandCallArgs)
  } else if (stepArgs.commandCreatorFnName === 'mix') {
    return curryCommandCreator(mix, stepArgs)
  } else {
    console.warn(
      // @ts-expect-error(sa, 2021-6-14): I don't think this case can ever happen, so stepArgs.commandCreatorFnName gets never typed
      `getStepArgsForSubsteps got unsupported stepType "${stepArgs.commandCreatorFnName}"`
    )
    return null
  }
}

export const mergeSubstepRowsSingleChannel = (args: {
  substepRows: SubstepTimelineFrame[]
  showDispenseVol: boolean
}): StepItemSourceDestRow[] => {
  const { substepRows, showDispenseVol } = args
  //  TODO(jr, 5/2/24): filtering out air gap steps for now since a refactor would be required
  //  to figure out if the air gap is for the aspirate or dispense labware. Otherwise, a white screen
  //  was happening with an air gap step trying to happen in an aspirate labware well that did not exist
  const filteredSubstepRows = substepRows.filter(row => !row.isAirGap)
  return steplistUtils.mergeWhen(
    filteredSubstepRows,
    (
      currentRow,
      nextRow // NOTE: if aspirate then dispense rows are adjacent, collapse them into one row
    ) => currentRow.source && nextRow.dest,
    (currentRow, nextRow) => ({
      ...currentRow,
      source: {
        well: currentRow.source && currentRow.source.wells[0],
        preIngreds: currentRow.source && currentRow.source.preIngreds,
        postIngreds: currentRow.source && currentRow.source.postIngreds,
      },
      ...nextRow,
      dest: {
        well: nextRow.dest && nextRow.dest.wells[0],
        preIngreds: nextRow.dest && nextRow.dest.preIngreds,
        postIngreds: nextRow.dest && nextRow.dest.postIngreds,
      },
      volume: showDispenseVol ? nextRow.volume : currentRow.volume,
    }),
    currentRow => {
      const source = currentRow.source && {
        well: currentRow.source.wells[0],
        preIngreds: currentRow.source.preIngreds,
        postIngreds: currentRow.source.postIngreds,
      }
      const dest = currentRow.dest && {
        well: currentRow.dest.wells[0],
        preIngreds: currentRow.dest.preIngreds,
        postIngreds: currentRow.dest.postIngreds,
      }
      return {
        activeTips: currentRow.activeTips,
        source,
        dest,
        volume: currentRow.volume,
      }
    }
  )
}
export const mergeSubstepRowsMultiChannel = (args: {
  substepRows: SubstepTimelineFrame[]
  channels: number
  isMixStep: boolean
  showDispenseVol: boolean
}): StepItemSourceDestRow[][] => {
  const { substepRows, channels, isMixStep, showDispenseVol } = args
  //  TODO(jr, 5/2/24): filtering out air gap steps for now since a refactor would be required
  //  to figure out if the air gap is for the aspirate or dispense labware. Otherwise, a white screen
  //  was happening with an air gap step trying to happen in an aspirate labware well that did not exist
  const filteredSubstepRows = substepRows.filter(row => !row.isAirGap)
  return steplistUtils.mergeWhen(
    filteredSubstepRows,
    (
      currentMultiRow: SubstepTimelineFrame,
      nextMultiRow: SubstepTimelineFrame
    ) => {
      // aspirate then dispense multirows adjacent
      // (inferring from first channel row in each multirow)
      return (
        currentMultiRow &&
        currentMultiRow.source &&
        nextMultiRow &&
        nextMultiRow.dest
      )
    }, // Merge each channel row together when predicate true
    (currentMultiRow, nextMultiRow) => {
      return range(channels).map(channelIndex => {
        const sourceChannelWell =
          currentMultiRow.source && currentMultiRow.source.wells[channelIndex]
        const destChannelWell =
          nextMultiRow.dest && nextMultiRow.dest.wells[channelIndex]
        const source = currentMultiRow.source &&
          sourceChannelWell && {
            well: sourceChannelWell,
            preIngreds: currentMultiRow.source.preIngreds[sourceChannelWell],
            postIngreds: currentMultiRow.source.postIngreds[sourceChannelWell],
          }
        const dest = nextMultiRow.dest &&
          destChannelWell && {
            well: destChannelWell,
            preIngreds: nextMultiRow.dest.preIngreds[destChannelWell],
            postIngreds: nextMultiRow.dest.postIngreds[destChannelWell],
          }
        const activeTips = currentMultiRow.activeTips
        return {
          activeTips,
          source,
          dest: isMixStep ? source : dest,
          // NOTE: since source and dest are same for mix, we're showing source on both sides. Otherwise dest would show the intermediate volume state
          volume: showDispenseVol
            ? nextMultiRow.volume
            : currentMultiRow.volume,
        }
      })
    },
    currentMultiRow =>
      range(channels).map(channelIndex => {
        const source = currentMultiRow.source && {
          well: currentMultiRow.source.wells[channelIndex],
          preIngreds:
            currentMultiRow.source.preIngreds[
              currentMultiRow.source.wells[channelIndex]
            ],
          postIngreds:
            currentMultiRow.source.postIngreds[
              currentMultiRow.source.wells[channelIndex]
            ],
        }
        const dest = currentMultiRow.dest && {
          well: currentMultiRow.dest.wells[channelIndex],
          preIngreds:
            currentMultiRow.dest.preIngreds[
              currentMultiRow.dest.wells[channelIndex]
            ],
          postIngreds:
            currentMultiRow.dest.postIngreds[
              currentMultiRow.dest.wells[channelIndex]
            ],
        }
        const activeTips = currentMultiRow.activeTips
        return {
          activeTips,
          source,
          dest,
          volume: currentMultiRow.volume,
        }
      })
  )
}

function transferLikeSubsteps(args: {
  stepArgs: ConsolidateArgs | DistributeArgs | TransferArgs | MixArgs
  invariantContext: InvariantContext
  robotState: RobotState
  stepId: StepIdType
}): SourceDestSubstepItem | null | undefined {
  const { stepArgs, invariantContext, stepId } = args
  // Add tips to pipettes, since this is just a "simulation"
  // TODO: Ian 2018-07-31 develop more elegant way to bypass tip handling for simulation/test
  const tipState = cloneDeep(args.robotState.tipState)
  tipState.pipettes = mapValues(tipState.pipettes, () => true)
  const initialRobotState = { ...args.robotState, tipState }
  const { pipette: pipetteId } = stepArgs
  const pipetteSpec = invariantContext.pipetteEntities[pipetteId]?.spec

  // TODO Ian 2018-04-06 use assert here
  if (!pipetteSpec) {
    console.assert(
      false,
      `Pipette "${pipetteId}" does not exist, step ${stepId} can't determine channels`
    )
    return null
  }

  // if false, show aspirate vol instead
  const showDispenseVol = stepArgs.commandCreatorFnName === 'distribute'
  // Call appropriate command creator with the validateForm fields.
  // Disable any mix args so those aspirate/dispenses don't show up in substeps
  const substepCommandCreator = getCommandCreatorForTransferlikeSubsteps(
    stepArgs
  )

  if (!substepCommandCreator) {
    console.assert(
      false,
      `transferLikeSubsteps could not make a command creator`
    )
    return null
  }

  // Multichannel substeps
  if (pipetteSpec.channels > 1) {
    const substepRows: SubstepTimelineFrame[] = substepTimeline(
      substepCommandCreator,
      invariantContext,
      initialRobotState,
      pipetteSpec.channels,
      stepArgs.nozzles
    )
    const mergedMultiRows: StepItemSourceDestRow[][] = mergeSubstepRowsMultiChannel(
      {
        substepRows,
        isMixStep: stepArgs.commandCreatorFnName === 'mix',
        channels: pipetteSpec.channels,
        showDispenseVol,
      }
    )
    return {
      substepType: 'sourceDest',
      multichannel: true,
      commandCreatorFnName: stepArgs.commandCreatorFnName,
      parentStepId: stepId,
      multiRows: mergedMultiRows,
    }
  } else {
    // single channel
    const substepRows = substepTimeline(
      substepCommandCreator,
      invariantContext,
      initialRobotState,
      1,
      null
    )
    const mergedRows: StepItemSourceDestRow[] = mergeSubstepRowsSingleChannel({
      substepRows,
      showDispenseVol,
    })
    return {
      substepType: 'sourceDest',
      multichannel: false,
      commandCreatorFnName: stepArgs.commandCreatorFnName,
      parentStepId: stepId,
      rows: mergedRows,
    }
  }
}

export function generateSubstepItem(
  stepArgsAndErrors: StepArgsAndErrors | null | undefined,
  invariantContext: InvariantContext,
  robotState: RobotState | null | undefined,
  stepId: string,
  labwareNamesByModuleId: LabwareNamesByModuleId
): SubstepItemData | null | undefined {
  if (!robotState) {
    console.info(
      `No robot state, could not generate substeps for step ${stepId}.` +
        `There was probably an upstream error.`
    )
    return null
  }

  // TODO: BC: 2018-08-21 replace old error check with new logic in field, form, and timeline level
  // Don't try to render with form errors. TODO LATER: presentational error state of substeps?
  if (
    !stepArgsAndErrors ||
    !stepArgsAndErrors.stepArgs ||
    !isEmpty(stepArgsAndErrors.errors)
  ) {
    return null
  }

  const { stepArgs } = stepArgsAndErrors

  if (
    stepArgs.commandCreatorFnName === 'consolidate' ||
    stepArgs.commandCreatorFnName === 'distribute' ||
    stepArgs.commandCreatorFnName === 'transfer' ||
    stepArgs.commandCreatorFnName === 'mix'
  ) {
    return transferLikeSubsteps({
      stepArgs,
      invariantContext,
      robotState,
      stepId,
    })
  }

  if (stepArgs.commandCreatorFnName === THERMOCYCLER_PROFILE) {
    const labwareNames = stepArgs.moduleId
      ? labwareNamesByModuleId[stepArgs.moduleId]
      : null

    const {
      blockTargetTempHold,
      lidOpenHold,
      lidTargetTempHold,
      message,
      meta,
      profileSteps,
      profileTargetLidTemp,
      profileVolume,
    } = stepArgs
    return {
      substepType: THERMOCYCLER_PROFILE,
      blockTargetTempHold,
      labwareNickname: labwareNames?.nickname,
      lidOpenHold,
      lidTargetTempHold,
      message,
      meta,
      profileSteps,
      profileTargetLidTemp,
      profileVolume,
    }
  }

  if (stepArgs.commandCreatorFnName === THERMOCYCLER_STATE) {
    const labwareNames = stepArgs.moduleId
      ? labwareNamesByModuleId[stepArgs.moduleId]
      : null

    return {
      substepType: THERMOCYCLER_STATE,
      labwareNickname: labwareNames?.nickname,
      blockTargetTemp: stepArgs.blockTargetTemp,
      lidTargetTemp: stepArgs.lidTargetTemp,
      lidOpen: stepArgs.lidOpen,
      message: stepArgs.message,
    }
  }
  return null
}
