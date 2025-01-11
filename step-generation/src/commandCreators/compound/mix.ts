import flatMap from 'lodash/flatMap'
import {
  LOW_VOLUME_PIPETTES,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
  ALL,
  SINGLE,
} from '@opentrons/shared-data'
import {
  repeatArray,
  blowoutUtil,
  curryCommandCreator,
  reduceCommandCreators,
  getIsSafePipetteMovement,
  getHasWasteChute,
} from '../../utils'
import * as errorCreators from '../../errorCreators'
import {
  aspirate,
  configureForVolume,
  delay,
  dispense,
  replaceTip,
  touchTip,
} from '../atomic'

import type { NozzleConfigurationStyle } from '@opentrons/shared-data'
import type {
  MixArgs,
  CommandCreator,
  CurriedCommandCreator,
} from '../../types'
/** Helper fn to make mix command creators w/ minimal arguments */
export function mixUtil(args: {
  pipette: string
  labware: string
  well: string
  volume: number
  times: number
  aspirateOffsetFromBottomMm: number
  dispenseOffsetFromBottomMm: number
  aspirateFlowRateUlSec: number
  dispenseFlowRateUlSec: number
  tipRack: string
  aspirateXOffset: number
  dispenseXOffset: number
  aspirateYOffset: number
  dispenseYOffset: number
  aspirateDelaySeconds?: number | null | undefined
  dispenseDelaySeconds?: number | null | undefined
  nozzles: NozzleConfigurationStyle | null
}): CurriedCommandCreator[] {
  const {
    pipette,
    labware,
    well,
    volume,
    times,
    aspirateOffsetFromBottomMm,
    dispenseOffsetFromBottomMm,
    aspirateFlowRateUlSec,
    dispenseFlowRateUlSec,
    aspirateDelaySeconds,
    dispenseDelaySeconds,
    tipRack,
    aspirateXOffset,
    aspirateYOffset,
    dispenseXOffset,
    dispenseYOffset,
    nozzles,
  } = args

  const getDelayCommand = (seconds?: number | null): CurriedCommandCreator[] =>
    seconds
      ? [
          curryCommandCreator(delay, {
            commandCreatorFnName: 'delay',
            description: null,
            name: null,
            meta: null,
            wait: seconds,
          }),
        ]
      : []

  return repeatArray(
    [
      curryCommandCreator(aspirate, {
        pipette,
        volume,
        labware,
        well,
        offsetFromBottomMm: aspirateOffsetFromBottomMm,
        flowRate: aspirateFlowRateUlSec,
        tipRack,
        xOffset: aspirateXOffset,
        yOffset: aspirateYOffset,
        nozzles: null,
      }),
      ...getDelayCommand(aspirateDelaySeconds),
      curryCommandCreator(dispense, {
        pipette,
        volume,
        labware,
        well,
        offsetFromBottomMm: dispenseOffsetFromBottomMm,
        flowRate: dispenseFlowRateUlSec,
        xOffset: dispenseXOffset,
        yOffset: dispenseYOffset,
        tipRack,
        nozzles: nozzles,
      }),
      ...getDelayCommand(dispenseDelaySeconds),
    ],
    times
  )
}
export const mix: CommandCreator<MixArgs> = (
  data,
  invariantContext,
  prevRobotState
) => {
  /**
    Mix will aspirate and dispense a uniform volume some amount of times from a set of wells
    in a single labware.
     =====
     For mix, changeTip means:
    * 'always': before the first aspirate in each well, get a fresh tip
    * 'once': get a new tip at the beginning of the overall mix step, and use it throughout for all wells
    * 'never': reuse the tip from the last step
  */
  const actionName = 'mix'
  const {
    pipette,
    labware,
    wells,
    volume,
    times,
    changeTip,
    aspirateDelaySeconds,
    dispenseDelaySeconds,
    aspirateOffsetFromBottomMm,
    dispenseOffsetFromBottomMm,
    aspirateFlowRateUlSec,
    dispenseFlowRateUlSec,
    blowoutFlowRateUlSec,
    blowoutOffsetFromTopMm,
    dropTipLocation,
    tipRack,
    aspirateXOffset,
    aspirateYOffset,
    dispenseXOffset,
    dispenseYOffset,
    nozzles,
  } = data

  const pipChannels = invariantContext.pipetteEntities[pipette]?.spec.channels
  const is96Channel = pipChannels === 96
  const is8Channel = pipChannels === 8

  // Errors
  if (
    !prevRobotState.pipettes[pipette] ||
    !invariantContext.pipetteEntities[pipette]
  ) {
    // bail out before doing anything else
    return {
      errors: [
        errorCreators.pipetteDoesNotExist({
          pipette,
        }),
      ],
    }
  }

  if (!prevRobotState.labware[labware]) {
    return {
      errors: [
        errorCreators.labwareDoesNotExist({
          actionName,
          labware,
        }),
      ],
    }
  }

  const initialLabwareSlot = prevRobotState.labware[labware]?.slot
  const hasWasteChute = getHasWasteChute(
    invariantContext.additionalEquipmentEntities
  )

  if (
    hasWasteChute &&
    initialLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA
  ) {
    return { errors: [errorCreators.labwareDiscarded()] }
  }

  if (
    !dropTipLocation ||
    !invariantContext.additionalEquipmentEntities[dropTipLocation]
  ) {
    return { errors: [errorCreators.dropTipLocationDoesNotExist()] }
  }

  if ((is96Channel && nozzles !== ALL) || (is8Channel && nozzles === SINGLE)) {
    const isAspirateSafePipetteMovement = getIsSafePipetteMovement(
      data.nozzles,
      prevRobotState,
      invariantContext,
      pipette,
      labware,
      tipRack,
      { x: aspirateXOffset, y: aspirateYOffset }
    )
    const isDispenseSafePipetteMovement = getIsSafePipetteMovement(
      data.nozzles,
      prevRobotState,
      invariantContext,
      pipette,
      labware,
      tipRack,
      { x: dispenseXOffset, y: dispenseYOffset }
    )
    if (!isAspirateSafePipetteMovement && !isDispenseSafePipetteMovement) {
      return {
        errors: [errorCreators.possiblePipetteCollision()],
      }
    }
  }

  const configureForVolumeCommand: CurriedCommandCreator[] = LOW_VOLUME_PIPETTES.includes(
    invariantContext.pipetteEntities[pipette].name
  )
    ? [
        curryCommandCreator(configureForVolume, {
          pipetteId: pipette,
          volume: volume,
        }),
      ]
    : []
  // Command generation
  const commandCreators = flatMap(
    wells,
    (well: string, wellIndex: number): CurriedCommandCreator[] => {
      let tipCommands: CurriedCommandCreator[] = []

      if (changeTip === 'always' || (changeTip === 'once' && wellIndex === 0)) {
        tipCommands = [
          curryCommandCreator(replaceTip, {
            pipette,
            dropTipLocation,
            nozzles: data.nozzles ?? undefined,
            tipRack,
          }),
        ]
      }

      const touchTipCommands = data.touchTip
        ? [
            curryCommandCreator(touchTip, {
              pipette,
              labware,
              well,
              offsetFromBottomMm: data.touchTipMmFromBottom,
            }),
          ]
        : []
      const blowoutCommand = blowoutUtil({
        pipette: data.pipette,
        sourceLabwareId: data.labware,
        sourceWell: well,
        destLabwareId: data.labware,
        destWell: well,
        blowoutLocation: data.blowoutLocation,
        flowRate: blowoutFlowRateUlSec,
        offsetFromTopMm: blowoutOffsetFromTopMm,
        invariantContext,
        prevRobotState,
      })
      const mixCommands = mixUtil({
        pipette,
        labware,
        well,
        volume,
        times,
        aspirateOffsetFromBottomMm,
        dispenseOffsetFromBottomMm,
        aspirateFlowRateUlSec,
        dispenseFlowRateUlSec,
        aspirateDelaySeconds,
        dispenseDelaySeconds,
        tipRack,
        aspirateXOffset,
        aspirateYOffset,
        dispenseXOffset,
        dispenseYOffset,
        nozzles,
      })
      return [
        ...tipCommands,
        ...configureForVolumeCommand,
        ...mixCommands,
        ...blowoutCommand,
        ...touchTipCommands,
      ]
    }
  )
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
