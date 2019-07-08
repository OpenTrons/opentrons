// @flow
import chunk from 'lodash/chunk'
import flatMap from 'lodash/flatMap'
import * as errorCreators from '../../errorCreators'
import { getPipetteWithTipMaxVol } from '../../robotStateSelectors'
import type {
  ConsolidateArgs,
  InvariantContext,
  RobotState,
  CommandCreator,
  CompoundCommandCreator,
} from '../../types'
import { blowoutUtil } from '../../utils'
import { aspirate, dispense, replaceTip, touchTip } from '../atomic'
import { mixUtil } from './mix'

const consolidate = (args: ConsolidateArgs): CompoundCommandCreator => (
  invariantContext: InvariantContext,
  prevRobotState: RobotState
) => {
  /**
    Consolidate will aspirate several times in sequence from multiple source wells,
    then dispense into a single destination.

    If the volume to aspirate from the source wells exceeds the max volume of the pipette,
    then consolidate will be broken up into multiple asp-asp-disp, asp-asp-disp cycles.

    A single uniform volume will be aspirated from every source well.

    =====

    For consolidate, changeTip means:
    * 'always': before the first aspirate in a single asp-asp-disp cycle, get a fresh tip
    * 'once': get a new tip at the beginning of the consolidate step, and use it throughout
    * 'never': reuse the tip from the last step
  */
  const actionName = 'consolidate'

  const pipetteData = prevRobotState.pipettes[args.pipette]
  if (!pipetteData) {
    // bail out before doing anything else
    return [
      _robotState => ({
        errors: [
          errorCreators.pipetteDoesNotExist({
            actionName,
            pipette: args.pipette,
          }),
        ],
      }),
    ]
  }

  // TODO: BC 2019-07-08 these argument names are a bit misleading, instead of being values bound
  // to the action of aspiration of dispensing in a given command, they are actually values bound
  // to a given labware associated with a command (e.g. Source, Destination). For this reason we
  // currently remapping the inner mix values. Those calls to mixUtil should become easier to read
  // when we decide to rename these fields/args... probably all the way up to the UI level.
  const {
    aspirateFlowRateUlSec,
    dispenseFlowRateUlSec,
    blowoutFlowRateUlSec,
    aspirateOffsetFromBottomMm,
    dispenseOffsetFromBottomMm,
    blowoutOffsetFromTopMm,
  } = args

  const maxWellsPerChunk = Math.floor(
    getPipetteWithTipMaxVol(args.pipette, invariantContext) / args.volume
  )

  const commandCreators = flatMap(
    chunk(args.sourceWells, maxWellsPerChunk),
    (
      sourceWellChunk: Array<string>,
      chunkIndex: number
    ): Array<CommandCreator> => {
      // Aspirate commands for all source wells in the chunk
      const aspirateCommands = flatMap(
        sourceWellChunk,
        (sourceWell: string, wellIndex: number): Array<CommandCreator> => {
          const touchTipAfterAspirateCommand = args.touchTipAfterAspirate
            ? [
                touchTip({
                  pipette: args.pipette,
                  labware: args.sourceLabware,
                  well: sourceWell,
                  offsetFromBottomMm:
                    args.touchTipAfterAspirateOffsetMmFromBottom,
                }),
              ]
            : []

          return [
            aspirate({
              pipette: args.pipette,
              volume: args.volume,
              labware: args.sourceLabware,
              well: sourceWell,
              flowRate: aspirateFlowRateUlSec,
              offsetFromBottomMm: aspirateOffsetFromBottomMm,
            }),
            ...touchTipAfterAspirateCommand,
          ]
        }
      )

      let tipCommands: Array<CommandCreator> = []

      if (
        args.changeTip === 'always' ||
        (args.changeTip === 'once' && chunkIndex === 0)
      ) {
        tipCommands = [replaceTip(args.pipette)]
      }

      const touchTipAfterDispenseCommands = args.touchTipAfterDispense
        ? [
            touchTip({
              pipette: args.pipette,
              labware: args.destLabware,
              well: args.destWell,
              offsetFromBottomMm: args.touchTipAfterDispenseOffsetMmFromBottom,
            }),
          ]
        : []

      const mixBeforeCommands = args.mixFirstAspirate
        ? mixUtil({
            pipette: args.pipette,
            labware: args.sourceLabware,
            well: sourceWellChunk[0],
            volume: args.mixFirstAspirate.volume,
            times: args.mixFirstAspirate.times,
            aspirateOffsetFromBottomMm,
            dispenseOffsetFromBottomMm: aspirateOffsetFromBottomMm,
            aspirateFlowRateUlSec,
            dispenseFlowRateUlSec,
          })
        : []

      const preWetTipCommands = args.preWetTip
        ? // Pre-wet tip is equivalent to a single mix, with volume equal to the consolidate volume.
          mixUtil({
            pipette: args.pipette,
            labware: args.sourceLabware,
            well: sourceWellChunk[0],
            volume: args.volume,
            times: 1,
            aspirateOffsetFromBottomMm,
            dispenseOffsetFromBottomMm: aspirateOffsetFromBottomMm,
            aspirateFlowRateUlSec,
            dispenseFlowRateUlSec,
          })
        : []

      const mixAfterCommands = args.mixInDestination
        ? mixUtil({
            pipette: args.pipette,
            labware: args.destLabware,
            well: args.destWell,
            volume: args.mixInDestination.volume,
            times: args.mixInDestination.times,
            aspirateOffsetFromBottomMm: dispenseOffsetFromBottomMm,
            dispenseOffsetFromBottomMm,
            aspirateFlowRateUlSec,
            dispenseFlowRateUlSec,
          })
        : []

      const blowoutCommand = blowoutUtil({
        pipette: args.pipette,
        sourceLabwareId: args.sourceLabware,
        sourceWell: sourceWellChunk[0],
        destLabwareId: args.destLabware,
        destWell: args.destWell,
        blowoutLocation: args.blowoutLocation,
        flowRate: blowoutFlowRateUlSec,
        offsetFromTopMm: blowoutOffsetFromTopMm,
        invariantContext,
      })

      return [
        ...tipCommands,
        ...mixBeforeCommands,
        ...preWetTipCommands, // NOTE when you both mix-before and pre-wet tip, it's kinda redundant. Prewet is like mixing once.
        ...aspirateCommands,
        dispense({
          pipette: args.pipette,
          volume: args.volume * sourceWellChunk.length,
          labware: args.destLabware,
          well: args.destWell,
          flowRate: dispenseFlowRateUlSec,
          offsetFromBottomMm: dispenseOffsetFromBottomMm,
        }),
        ...mixAfterCommands,
        ...touchTipAfterDispenseCommands,
        ...blowoutCommand,
      ]
    }
  )

  return commandCreators
}

export default consolidate
