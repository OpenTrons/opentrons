import chunk from 'lodash/chunk'
import flatMap from 'lodash/flatMap'
import {
  LOW_VOLUME_PIPETTES,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
  ALL,
} from '@opentrons/shared-data'
import * as errorCreators from '../../errorCreators'
import { getPipetteWithTipMaxVol } from '../../robotStateSelectors'
import { dropTipInTrash } from './dropTipInTrash'
import {
  airGapLocationHelper,
  blowoutLocationHelper,
  curryCommandCreator,
  dispenseLocationHelper,
  getIsSafePipetteMovement,
  delayLocationHelper,
  reduceCommandCreators,
} from '../../utils'
import {
  aspirate,
  configureForVolume,
  delay,
  dropTip,
  touchTip,
} from '../atomic'
import { mixUtil } from './mix'
import { replaceTip } from './replaceTip'
import { dropTipInWasteChute } from './dropTipInWasteChute'
import type { CutoutId } from '@opentrons/shared-data'
import type {
  ConsolidateArgs,
  CommandCreator,
  CurriedCommandCreator,
} from '../../types'
import { airGapInWell } from './airGapInWell'

export const consolidate: CommandCreator<ConsolidateArgs> = (
  args,
  invariantContext,
  prevRobotState
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

  // TODO: BC 2019-07-08 these argument names are a bit misleading, instead of being values bound
  // to the action of aspiration of dispensing in a given command, they are actually values bound
  // to a given labware associated with a command (e.g. Source, Destination). For this reason we
  // currently remapping the inner mix values. Those calls to mixUtil should become easier to read
  // when we decide to rename these fields/args... probably all the way up to the UI level.
  const {
    aspirateDelay,
    aspirateFlowRateUlSec,
    aspirateOffsetFromBottomMm,
    blowoutFlowRateUlSec,
    blowoutOffsetFromTopMm,
    dispenseAirGapVolume,
    dispenseDelay,
    dispenseFlowRateUlSec,
    dispenseOffsetFromBottomMm,
    mixFirstAspirate,
    mixInDestination,
    dropTipLocation,
    aspirateXOffset,
    aspirateYOffset,
    dispenseXOffset,
    dispenseYOffset,
    destLabware,
    sourceLabware,
    nozzles,
  } = args

  const pipetteData = prevRobotState.pipettes[args.pipette]
  const isMultiChannelPipette =
    invariantContext.pipetteEntities[args.pipette]?.spec.channels !== 1

  if (!pipetteData) {
    // bail out before doing anything else
    return {
      errors: [
        errorCreators.pipetteDoesNotExist({
          pipette: args.pipette,
        }),
      ],
    }
  }

  if (
    !args.destLabware ||
    (!invariantContext.labwareEntities[args.destLabware] &&
      !invariantContext.trashBinEntities[args.destLabware] &&
      !invariantContext.wasteChuteEntities[args.destLabware])
  ) {
    return { errors: [errorCreators.equipmentDoesNotExist()] }
  }

  const initialDestLabwareSlot = prevRobotState.labware[destLabware]?.slot
  const initialSourceLabwareSlot = prevRobotState.labware[sourceLabware]?.slot
  const hasWasteChute =
    Object.keys(invariantContext.wasteChuteEntities).length > 0

  if (
    hasWasteChute &&
    (initialDestLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA ||
      initialSourceLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA)
  ) {
    return { errors: [errorCreators.labwareDiscarded()] }
  }

  const isWasteChute =
    invariantContext.wasteChuteEntities[args.dropTipLocation] != null
  const isTrashBin =
    invariantContext.trashBinEntities[args.dropTipLocation] != null

  if (!args.dropTipLocation || (!isWasteChute && !isTrashBin)) {
    return { errors: [errorCreators.dropTipLocationDoesNotExist()] }
  }

  if (isMultiChannelPipette && nozzles !== ALL) {
    const isAspirateSafePipetteMovement = getIsSafePipetteMovement(
      args.nozzles,
      prevRobotState,
      invariantContext,
      args.pipette,
      args.sourceLabware,
      args.tipRack,
      { x: aspirateXOffset, y: aspirateYOffset }
    )
    const isDispenseSafePipetteMovement = getIsSafePipetteMovement(
      args.nozzles,
      prevRobotState,
      invariantContext,
      args.pipette,
      args.destLabware,
      args.tipRack,
      { x: dispenseXOffset, y: dispenseYOffset }
    )
    if (!isAspirateSafePipetteMovement && !isDispenseSafePipetteMovement) {
      return {
        errors: [errorCreators.possiblePipetteCollision()],
      }
    }
  }

  const aspirateAirGapVolume = args.aspirateAirGapVolume || 0
  const maxWellsPerChunk = Math.floor(
    getPipetteWithTipMaxVol(args.pipette, invariantContext, args.tipRack) /
      (args.volume + aspirateAirGapVolume)
  )

  const destinationWell = args.destWell

  const sourceWellChunks = chunk(args.sourceWells, maxWellsPerChunk)

  const commandCreators = flatMap(
    sourceWellChunks,
    (
      sourceWellChunk: string[],
      chunkIndex: number
    ): CurriedCommandCreator[] => {
      const isLastChunk = chunkIndex + 1 === sourceWellChunks.length
      // Aspirate commands for all source wells in the chunk
      const aspirateCommands = flatMap(
        sourceWellChunk,
        (sourceWell: string, wellIndex: number): CurriedCommandCreator[] => {
          const airGapAfterAspirateCommands = aspirateAirGapVolume
            ? [
                curryCommandCreator(airGapInWell, {
                  pipetteId: args.pipette,
                  labwareId: args.sourceLabware,
                  wellName: sourceWell,
                  volume: aspirateAirGapVolume,
                  flowRate: aspirateFlowRateUlSec,
                  type: 'aspirate',
                }),
                ...(aspirateDelay != null
                  ? [
                      curryCommandCreator(delay, {
                        seconds: aspirateDelay.seconds,
                      }),
                    ]
                  : []),
              ]
            : []
          const delayAfterAspirateCommands =
            aspirateDelay != null
              ? [
                  curryCommandCreator(delayLocationHelper, {
                    pipetteId: args.pipette,
                    destinationId: args.sourceLabware,
                    well: sourceWell,
                    zOffset: aspirateDelay.mmFromBottom,
                    seconds: aspirateDelay.seconds,
                  }),
                ]
              : []
          const touchTipAfterAspirateCommand = args.touchTipAfterAspirate
            ? [
                curryCommandCreator(touchTip, {
                  pipetteId: args.pipette,
                  labwareId: args.sourceLabware,
                  wellName: sourceWell,
                  zOffsetFromTop: args.touchTipAfterAspirateOffsetMmFromTop,
                }),
              ]
            : []

          return [
            curryCommandCreator(aspirate, {
              pipetteId: args.pipette,
              volume: args.volume,
              labwareId: args.sourceLabware,
              wellName: sourceWell,
              flowRate: aspirateFlowRateUlSec,
              wellLocation: {
                origin: 'bottom',
                offset: {
                  z: aspirateOffsetFromBottomMm,
                  x: aspirateXOffset,
                  y: aspirateYOffset,
                },
              },
              tipRack: args.tipRack,
              nozzles,
            }),
            ...delayAfterAspirateCommands,
            ...touchTipAfterAspirateCommand,
            ...airGapAfterAspirateCommands,
          ]
        }
      )
      let tipCommands: CurriedCommandCreator[] = []

      if (
        args.changeTip === 'always' ||
        (args.changeTip === 'once' && chunkIndex === 0)
      ) {
        tipCommands = [
          curryCommandCreator(replaceTip, {
            pipette: args.pipette,
            dropTipLocation,
            tipRack: args.tipRack,
            nozzles: args.nozzles ?? undefined,
          }),
        ]
      }

      //  can not touch tip in a waste chute
      const touchTipAfterDispenseCommands: CurriedCommandCreator[] =
        args.touchTipAfterDispense && destinationWell != null
          ? [
              curryCommandCreator(touchTip, {
                pipetteId: args.pipette,
                labwareId: args.destLabware,
                wellName: destinationWell,
                zOffsetFromTop: args.touchTipAfterDispenseOffsetMmFromTop,
              }),
            ]
          : []
      const mixBeforeCommands =
        mixFirstAspirate != null
          ? mixUtil({
              pipette: args.pipette,
              labware: args.sourceLabware,
              well: sourceWellChunk[0],
              volume: mixFirstAspirate.volume,
              times: mixFirstAspirate.times,
              offsetFromBottomMm: aspirateOffsetFromBottomMm,
              aspirateFlowRateUlSec,
              dispenseFlowRateUlSec,
              aspirateDelaySeconds: aspirateDelay?.seconds,
              dispenseDelaySeconds: dispenseDelay?.seconds,
              tipRack: args.tipRack,
              xOffset: aspirateXOffset,
              yOffset: aspirateYOffset,
              nozzles,
              invariantContext,
            })
          : []
      const preWetTipCommands = args.preWetTip // Pre-wet tip is equivalent to a single mix, with volume equal to the consolidate volume.
        ? mixUtil({
            pipette: args.pipette,
            labware: args.sourceLabware,
            well: sourceWellChunk[0],
            volume: args.volume,
            times: 1,
            offsetFromBottomMm: aspirateOffsetFromBottomMm,
            aspirateFlowRateUlSec,
            dispenseFlowRateUlSec,
            aspirateDelaySeconds: aspirateDelay?.seconds,
            dispenseDelaySeconds: dispenseDelay?.seconds,
            tipRack: args.tipRack,
            xOffset: aspirateXOffset,
            yOffset: aspirateYOffset,
            nozzles,
            invariantContext,
          })
        : []
      //  can not mix in a waste chute
      const mixAfterCommands =
        mixInDestination != null && destinationWell != null
          ? mixUtil({
              pipette: args.pipette,
              labware: args.destLabware,
              well: destinationWell,
              volume: mixInDestination.volume,
              times: mixInDestination.times,
              offsetFromBottomMm: dispenseOffsetFromBottomMm,
              aspirateFlowRateUlSec,
              dispenseFlowRateUlSec,
              aspirateDelaySeconds: aspirateDelay?.seconds,
              dispenseDelaySeconds: dispenseDelay?.seconds,
              tipRack: args.tipRack,
              xOffset: dispenseXOffset,
              yOffset: dispenseYOffset,
              nozzles,
              invariantContext,
            })
          : []

      const configureForVolumeCommand: CurriedCommandCreator[] = LOW_VOLUME_PIPETTES.includes(
        invariantContext.pipetteEntities[args.pipette].name
      )
        ? [
            curryCommandCreator(configureForVolume, {
              pipetteId: args.pipette,
              volume:
                args.volume * sourceWellChunk.length +
                aspirateAirGapVolume * sourceWellChunk.length,
            }),
          ]
        : []
      const dispenseCommands = [
        curryCommandCreator(dispenseLocationHelper, {
          pipetteId: args.pipette,
          volume:
            args.volume * sourceWellChunk.length +
            aspirateAirGapVolume * sourceWellChunk.length,
          destinationId: args.destLabware,
          well: destinationWell ?? undefined,
          flowRate: dispenseFlowRateUlSec,
          offsetFromBottomMm: dispenseOffsetFromBottomMm,
          xOffset: dispenseXOffset,
          yOffset: dispenseYOffset,
          nozzles,
          tipRack: args.tipRack,
        }),
      ]

      const delayAfterDispenseCommands =
        dispenseDelay != null
          ? [
              curryCommandCreator(delayLocationHelper, {
                pipetteId: args.pipette,
                destinationId: args.destLabware,
                well: destinationWell,
                zOffset: dispenseDelay.mmFromBottom,
                seconds: dispenseDelay.seconds,
              }),
            ]
          : []

      const blowoutCommand = blowoutLocationHelper({
        pipette: args.pipette,
        sourceLabwareId: args.sourceLabware,
        sourceWell: sourceWellChunk[0],
        destLabwareId: args.destLabware,
        destWell: destinationWell,
        blowoutLocation: args.blowoutLocation,
        flowRate: blowoutFlowRateUlSec,
        offsetFromTopMm: blowoutOffsetFromTopMm,
        invariantContext,
      })

      const willReuseTip = args.changeTip !== 'always' && !isLastChunk
      const airGapAfterDispenseCommands =
        dispenseAirGapVolume && !willReuseTip
          ? [
              curryCommandCreator(airGapLocationHelper, {
                pipetteId: args.pipette,
                volume: dispenseAirGapVolume,
                destinationId: args.destLabware,
                destWell: destinationWell,
                flowRate: aspirateFlowRateUlSec,
              }),
              ...(aspirateDelay != null
                ? [
                    curryCommandCreator(delay, {
                      seconds: aspirateDelay.seconds,
                    }),
                  ]
                : []),
            ]
          : []

      let dropTipCommand = [
        curryCommandCreator(dropTip, {
          pipette: args.pipette,
          dropTipLocation: args.dropTipLocation,
        }),
      ]
      if (isWasteChute) {
        dropTipCommand = [
          curryCommandCreator(dropTipInWasteChute, {
            pipetteId: args.pipette,
            wasteChuteId:
              invariantContext.wasteChuteEntities[args.dropTipLocation].id,
          }),
        ]
      }
      if (isTrashBin) {
        dropTipCommand = [
          curryCommandCreator(dropTipInTrash, {
            pipetteId: args.pipette,
            trashLocation: invariantContext.trashBinEntities[
              args.dropTipLocation
            ].location as CutoutId,
          }),
        ]
      }

      // if using dispense > air gap, drop or change the tip at the end
      const dropTipAfterDispenseAirGap =
        airGapAfterDispenseCommands.length > 0 ? dropTipCommand : []

      return [
        ...tipCommands,
        ...configureForVolumeCommand,
        ...mixBeforeCommands,
        ...preWetTipCommands, // NOTE when you both mix-before and pre-wet tip, it's kinda redundant. Prewet is like mixing once.
        ...aspirateCommands,
        ...dispenseCommands,
        ...delayAfterDispenseCommands,
        ...mixAfterCommands,
        ...blowoutCommand,
        ...touchTipAfterDispenseCommands,
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
