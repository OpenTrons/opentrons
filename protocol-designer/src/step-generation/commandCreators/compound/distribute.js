// @flow
import chunk from 'lodash/chunk'
import flatMap from 'lodash/flatMap'
import last from 'lodash/last'
import { getWellDepth } from '@opentrons/shared-data'
import { AIR_GAP_OFFSET_FROM_TOP } from '../../../constants'
import * as errorCreators from '../../errorCreators'
import { getPipetteWithTipMaxVol } from '../../robotStateSelectors'
import {
  airGap,
  aspirate,
  delay,
  dispense,
  dispenseAirGap,
  dropTip,
  moveToWell,
  replaceTip,
  touchTip,
} from '../atomic'
import { mixUtil } from './mix'
import {
  curryCommandCreator,
  reduceCommandCreators,
  blowoutUtil,
  getDispenseAirGapLocation,
} from '../../utils'
import type {
  DistributeArgs,
  CommandCreator,
  CurriedCommandCreator,
  CommandCreatorError,
} from '../../types'

export const distribute: CommandCreator<DistributeArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /**
    Distribute will aspirate from a single source well into multiple destination wells.

    If the volume to aspirate from the source well exceeds the max volume of the pipette,
    then distribute will be broken up into multiple asp-disp-disp, asp-disp-disp cycles.

    A single uniform volume will be aspirated to every destination well.

    =====

    For distribute, changeTip means:
    * 'always': before the first aspirate in a single asp-disp-disp cycle, get a fresh tip
    * 'once': get a new tip at the beginning of the distribute step, and use it throughout
    * 'never': reuse the tip from the last step
  */

  // TODO Ian 2018-05-03 next ~20 lines match consolidate.js
  const actionName = 'distribute'
  const errors: Array<CommandCreatorError> = []

  // TODO: Ian 2019-04-19 revisit these pipetteDoesNotExist errors, how to do it DRY?
  if (
    !prevRobotState.pipettes[args.pipette] ||
    !invariantContext.pipetteEntities[args.pipette]
  ) {
    errors.push(
      errorCreators.pipetteDoesNotExist({
        actionName,
        pipette: args.pipette,
      })
    )
  }

  if (!args.sourceLabware || !prevRobotState.labware[args.sourceLabware]) {
    errors.push(
      errorCreators.labwareDoesNotExist({
        actionName,
        labware: args.sourceLabware,
      })
    )
  }

  if (errors.length) return { errors }

  // TODO: BC 2019-07-08 these argument names are a bit misleading, instead of being values bound
  // to the action of aspiration of dispensing in a given command, they are actually values bound
  // to a given labware associated with a command (e.g. Source, Destination). For this reason we
  // currently remapping the inner mix values. Those calls to mixUtil should become easier to read
  // when we decide to rename these fields/args... probably all the way up to the UI level.
  const {
    aspirateDelay,
    aspirateFlowRateUlSec,
    aspirateOffsetFromBottomMm,
    dispenseDelay,
    dispenseFlowRateUlSec,
    dispenseOffsetFromBottomMm,
    blowoutLocation,
  } = args

  const aspirateAirGapVolume = args.aspirateAirGapVolume || 0
  const dispenseAirGapVolume = args.dispenseAirGapVolume || 0

  // TODO error on negative args.disposalVolume?
  const disposalVolume =
    args.disposalVolume && args.disposalVolume > 0 ? args.disposalVolume : 0

  const maxVolume =
    getPipetteWithTipMaxVol(args.pipette, invariantContext) -
    aspirateAirGapVolume

  const maxWellsPerChunk = Math.floor(
    (maxVolume - disposalVolume) / args.volume
  )

  const { pipette } = args

  if (maxWellsPerChunk === 0) {
    // distribute vol exceeds pipette vol
    return {
      errors: [
        errorCreators.pipetteVolumeExceeded({
          actionName,
          volume: args.volume,
          maxVolume,
          disposalVolume,
        }),
      ],
    }
  }

  const commandCreators = flatMap(
    chunk(args.destWells, maxWellsPerChunk),
    (
      destWellChunk: Array<string>,
      chunkIndex: number
    ): Array<CurriedCommandCreator> => {
      const firstDestWell = destWellChunk[0]
      const sourceLabwareDef =
        invariantContext.labwareEntities[args.sourceLabware].def
      const destLabwareDef =
        invariantContext.labwareEntities[args.destLabware].def

      const airGapOffsetSourceWell =
        getWellDepth(sourceLabwareDef, args.sourceWell) +
        AIR_GAP_OFFSET_FROM_TOP
      const airGapOffsetDestWell =
        getWellDepth(destLabwareDef, firstDestWell) + AIR_GAP_OFFSET_FROM_TOP
      const airGapAfterAspirateCommands = aspirateAirGapVolume
        ? [
            curryCommandCreator(airGap, {
              pipette: args.pipette,
              volume: aspirateAirGapVolume,
              labware: args.sourceLabware,
              well: args.sourceWell,
              flowRate: aspirateFlowRateUlSec,
              offsetFromBottomMm: airGapOffsetSourceWell,
            }),
            ...(aspirateDelay
              ? [
                  curryCommandCreator(delay, {
                    commandCreatorFnName: 'delay',
                    description: null,
                    name: null,
                    meta: null,
                    wait: aspirateDelay.seconds,
                  }),
                ]
              : []),
            curryCommandCreator(dispenseAirGap, {
              pipette: args.pipette,
              volume: aspirateAirGapVolume,
              labware: args.destLabware,
              well: firstDestWell,
              flowRate: dispenseFlowRateUlSec,
              offsetFromBottomMm: airGapOffsetDestWell,
            }),
            ...(dispenseDelay
              ? [
                  curryCommandCreator(delay, {
                    commandCreatorFnName: 'delay',
                    description: null,
                    name: null,
                    meta: null,
                    wait: dispenseDelay.seconds,
                  }),
                ]
              : []),
          ]
        : []

      const dispenseCommands = flatMap(
        destWellChunk,
        (destWell: string, wellIndex: number): Array<CurriedCommandCreator> => {
          const delayAfterDispenseCommands =
            dispenseDelay != null
              ? [
                  curryCommandCreator(moveToWell, {
                    pipette: args.pipette,
                    labware: args.destLabware,
                    well: destWell,
                    offset: {
                      x: 0,
                      y: 0,
                      z: dispenseDelay.mmFromBottom,
                    },
                  }),
                  curryCommandCreator(delay, {
                    commandCreatorFnName: 'delay',
                    description: null,
                    name: null,
                    meta: null,
                    wait: dispenseDelay.seconds,
                  }),
                ]
              : []

          const touchTipAfterDispenseCommand = args.touchTipAfterDispense
            ? [
                curryCommandCreator(touchTip, {
                  pipette,
                  labware: args.destLabware,
                  well: destWell,
                  offsetFromBottomMm:
                    args.touchTipAfterDispenseOffsetMmFromBottom,
                }),
              ]
            : []

          return [
            curryCommandCreator(dispense, {
              pipette,
              volume: args.volume,
              labware: args.destLabware,
              well: destWell,
              flowRate: dispenseFlowRateUlSec,
              offsetFromBottomMm: dispenseOffsetFromBottomMm,
            }),
            ...delayAfterDispenseCommands,
            ...touchTipAfterDispenseCommand,
          ]
        }
      )

      // NOTE: identical to consolidate
      let tipCommands: Array<CurriedCommandCreator> = []

      if (
        args.changeTip === 'always' ||
        (args.changeTip === 'once' && chunkIndex === 0)
      ) {
        tipCommands = [
          curryCommandCreator(replaceTip, { pipette: args.pipette }),
        ]
      }

      let moreWellsRemaining = false
      if (destWellChunk.length < maxWellsPerChunk) {
        moreWellsRemaining = false
      } else if (
        args.destWells.length -
        destWellChunk.length * (chunkIndex + 1)
      ) {
        moreWellsRemaining = true
      }

      const {
        dispenseAirGapLabware,
        dispenseAirGapWell,
      } = getDispenseAirGapLocation({
        blowoutLocation,
        sourceLabware: args.sourceLabware,
        destLabware: args.destLabware,
        sourceWell: args.sourceWell,
        destWell: last(destWellChunk),
      })

      const airGapAfterDispenseCommands =
        dispenseAirGapVolume &&
        (args.changeTip === 'always' || !moreWellsRemaining)
          ? [
              curryCommandCreator(airGap, {
                pipette: args.pipette,
                volume: dispenseAirGapVolume,
                labware: dispenseAirGapLabware,
                well: dispenseAirGapWell,
                flowRate: aspirateFlowRateUlSec,
                offsetFromBottomMm: airGapOffsetDestWell,
              }),
              ...(aspirateDelay
                ? [
                    curryCommandCreator(delay, {
                      commandCreatorFnName: 'delay',
                      description: null,
                      name: null,
                      meta: null,
                      wait: aspirateDelay.seconds,
                    }),
                  ]
                : []),
            ]
          : []

      // if using dispense > air gap, drop or change the tip at the end
      const dropTipAfterDispenseAirGap =
        airGapAfterDispenseCommands.length > 0
          ? [curryCommandCreator(dropTip, { pipette: args.pipette })]
          : []

      const blowoutCommands = disposalVolume
        ? blowoutUtil({
            pipette: pipette,
            sourceLabwareId: args.sourceLabware,
            sourceWell: args.sourceWell,
            destLabwareId: args.destLabware,
            destWell: last(destWellChunk),
            blowoutLocation: blowoutLocation,
            flowRate: args.blowoutFlowRateUlSec,
            offsetFromTopMm: args.blowoutOffsetFromTopMm,
            invariantContext,
          })
        : []

      const delayAfterAspirateCommands =
        aspirateDelay != null
          ? [
              curryCommandCreator(moveToWell, {
                pipette: args.pipette,
                labware: args.sourceLabware,
                well: args.sourceWell,
                offset: {
                  x: 0,
                  y: 0,
                  z: aspirateDelay.mmFromBottom,
                },
              }),
              curryCommandCreator(delay, {
                commandCreatorFnName: 'delay',
                description: null,
                name: null,
                meta: null,
                wait: aspirateDelay.seconds,
              }),
            ]
          : []

      const touchTipAfterAspirateCommand = args.touchTipAfterAspirate
        ? [
            curryCommandCreator(touchTip, {
              pipette: args.pipette,
              labware: args.sourceLabware,
              well: args.sourceWell,
              offsetFromBottomMm: args.touchTipAfterAspirateOffsetMmFromBottom,
            }),
          ]
        : []

      const mixBeforeAspirateCommands = args.mixBeforeAspirate
        ? mixUtil({
            pipette: args.pipette,
            labware: args.sourceLabware,
            well: args.sourceWell,
            volume: args.mixBeforeAspirate.volume,
            times: args.mixBeforeAspirate.times,
            aspirateOffsetFromBottomMm,
            dispenseOffsetFromBottomMm: aspirateOffsetFromBottomMm,
            aspirateFlowRateUlSec,
            dispenseFlowRateUlSec,
            aspirateDelaySeconds: aspirateDelay?.seconds,
            dispenseDelaySeconds: dispenseDelay?.seconds,
          })
        : []

      return [
        ...tipCommands,
        ...mixBeforeAspirateCommands,
        curryCommandCreator(aspirate, {
          pipette,
          volume: args.volume * destWellChunk.length + disposalVolume,
          labware: args.sourceLabware,
          well: args.sourceWell,
          flowRate: aspirateFlowRateUlSec,
          offsetFromBottomMm: aspirateOffsetFromBottomMm,
        }),
        ...delayAfterAspirateCommands,
        ...touchTipAfterAspirateCommand,
        ...airGapAfterAspirateCommands,

        ...dispenseCommands,
        ...blowoutCommands,
        ...airGapAfterDispenseCommands,
        ...dropTipAfterDispenseAirGap,
      ]
    }
  )

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
