import chunk from 'lodash/chunk'
import flatMap from 'lodash/flatMap'
import {
  COLUMN,
  getWellDepth,
  LOW_VOLUME_PIPETTES,
} from '@opentrons/shared-data'
import { AIR_GAP_OFFSET_FROM_TOP } from '../../constants'
import * as errorCreators from '../../errorCreators'
import { getPipetteWithTipMaxVol } from '../../robotStateSelectors'
import { movableTrashCommandsUtil } from '../../utils/movableTrashCommandsUtil'
import {
  blowoutUtil,
  curryCommandCreator,
  reduceCommandCreators,
  wasteChuteCommandsUtil,
  getTrashOrLabware,
  airGapHelper,
  dispenseLocationHelper,
  moveHelper,
  getIsTallLabwareWestOf96Channel,
  getWasteChuteAddressableAreaNamePip,
} from '../../utils'
import {
  aspirate,
  configureForVolume,
  configureNozzleLayout,
  delay,
  dropTip,
  moveToWell,
  replaceTip,
  touchTip,
} from '../atomic'
import { mixUtil } from './mix'

import type {
  ConsolidateArgs,
  CommandCreator,
  CurriedCommandCreator,
} from '../../types'

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
  const actionName = 'consolidate'
  const pipetteData = prevRobotState.pipettes[args.pipette]
  const is96Channel =
    invariantContext.pipetteEntities[args.pipette]?.spec.channels === 96

  if (!pipetteData) {
    // bail out before doing anything else
    return {
      errors: [
        errorCreators.pipetteDoesNotExist({
          actionName,
          pipette: args.pipette,
        }),
      ],
    }
  }

  if (
    !args.destLabware ||
    (!invariantContext.labwareEntities[args.destLabware] &&
      !invariantContext.additionalEquipmentEntities[args.destLabware])
  ) {
    return { errors: [errorCreators.equipmentDoesNotExist()] }
  }

  if (
    !args.dropTipLocation ||
    !invariantContext.additionalEquipmentEntities[args.dropTipLocation]
  ) {
    return { errors: [errorCreators.dropTipLocationDoesNotExist()] }
  }

  if (
    is96Channel &&
    args.nozzles === COLUMN &&
    getIsTallLabwareWestOf96Channel(
      prevRobotState,
      invariantContext,
      args.sourceLabware,
      args.pipette,
      args.tipRack
    )
  ) {
    return {
      errors: [
        errorCreators.tallLabwareWestOf96ChannelPipetteLabware({
          source: 'aspirate',
          labware:
            invariantContext.labwareEntities[args.sourceLabware].def.metadata
              .displayName,
        }),
      ],
    }
  }

  if (
    is96Channel &&
    args.nozzles === COLUMN &&
    getIsTallLabwareWestOf96Channel(
      prevRobotState,
      invariantContext,
      args.destLabware,
      args.pipette,
      args.tipRack
    )
  ) {
    return {
      errors: [
        errorCreators.tallLabwareWestOf96ChannelPipetteLabware({
          source: 'dispense',
          labware:
            invariantContext.labwareEntities[args.destLabware].def.metadata
              .displayName,
        }),
      ],
    }
  }

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
  } = args
  const aspirateAirGapVolume = args.aspirateAirGapVolume || 0
  const maxWellsPerChunk = Math.floor(
    getPipetteWithTipMaxVol(args.pipette, invariantContext, args.tipRack) /
      (args.volume + aspirateAirGapVolume)
  )
  const sourceLabwareDef =
    invariantContext.labwareEntities[args.sourceLabware].def

  const trashOrLabware = getTrashOrLabware(
    invariantContext.labwareEntities,
    invariantContext.additionalEquipmentEntities,
    args.destLabware
  )

  const destinationWell = args.destWell

  const destLabwareDef =
    trashOrLabware === 'labware'
      ? invariantContext.labwareEntities[args.destLabware].def
      : null
  const wellDepth =
    destLabwareDef != null && destinationWell != null
      ? getWellDepth(destLabwareDef, destinationWell)
      : 0
  const airGapOffsetDestWell = wellDepth + AIR_GAP_OFFSET_FROM_TOP

  const sourceWellChunks = chunk(args.sourceWells, maxWellsPerChunk)

  const isWasteChute =
    invariantContext.additionalEquipmentEntities[args.dropTipLocation] !=
      null &&
    invariantContext.additionalEquipmentEntities[args.dropTipLocation].name ===
      'wasteChute'
  const isTrashBin =
    invariantContext.additionalEquipmentEntities[args.dropTipLocation] !=
      null &&
    invariantContext.additionalEquipmentEntities[args.dropTipLocation].name ===
      'trashBin'
  const channels = invariantContext.pipetteEntities[args.pipette].spec.channels
  const addressableAreaNameWasteChute = getWasteChuteAddressableAreaNamePip(
    channels
  )

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
          const airGapOffsetSourceWell =
            getWellDepth(sourceLabwareDef, sourceWell) + AIR_GAP_OFFSET_FROM_TOP
          const airGapAfterAspirateCommands = aspirateAirGapVolume
            ? [
                curryCommandCreator(aspirate, {
                  pipette: args.pipette,
                  volume: aspirateAirGapVolume,
                  labware: args.sourceLabware,
                  well: sourceWell,
                  flowRate: aspirateFlowRateUlSec,
                  offsetFromBottomMm: airGapOffsetSourceWell,
                  isAirGap: true,
                  tipRack: args.tipRack,
                }),
                ...(aspirateDelay != null
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
          const delayAfterAspirateCommands =
            aspirateDelay != null
              ? [
                  curryCommandCreator(moveToWell, {
                    pipette: args.pipette,
                    labware: args.sourceLabware,
                    well: sourceWell,
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
                  well: sourceWell,
                  offsetFromBottomMm:
                    args.touchTipAfterAspirateOffsetMmFromBottom,
                }),
              ]
            : []

          return [
            curryCommandCreator(aspirate, {
              pipette: args.pipette,
              volume: args.volume,
              labware: args.sourceLabware,
              well: sourceWell,
              flowRate: aspirateFlowRateUlSec,
              offsetFromBottomMm: aspirateOffsetFromBottomMm,
              tipRack: args.tipRack,
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
          }),
        ]
      }
      //  can not touch tip in a waste chute
      const touchTipAfterDispenseCommands: CurriedCommandCreator[] =
        args.touchTipAfterDispense && destinationWell != null
          ? [
              curryCommandCreator(touchTip, {
                pipette: args.pipette,
                labware: args.destLabware,
                well: destinationWell,
                offsetFromBottomMm:
                  args.touchTipAfterDispenseOffsetMmFromBottom,
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
              aspirateOffsetFromBottomMm,
              dispenseOffsetFromBottomMm: aspirateOffsetFromBottomMm,
              aspirateFlowRateUlSec,
              dispenseFlowRateUlSec,
              aspirateDelaySeconds: aspirateDelay?.seconds,
              dispenseDelaySeconds: dispenseDelay?.seconds,
              tipRack: args.tipRack,
            })
          : []
      const preWetTipCommands = args.preWetTip // Pre-wet tip is equivalent to a single mix, with volume equal to the consolidate volume.
        ? mixUtil({
            pipette: args.pipette,
            labware: args.sourceLabware,
            well: sourceWellChunk[0],
            volume: args.volume,
            times: 1,
            aspirateOffsetFromBottomMm,
            dispenseOffsetFromBottomMm: aspirateOffsetFromBottomMm,
            aspirateFlowRateUlSec,
            dispenseFlowRateUlSec,
            aspirateDelaySeconds: aspirateDelay?.seconds,
            dispenseDelaySeconds: dispenseDelay?.seconds,
            tipRack: args.tipRack,
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
              aspirateOffsetFromBottomMm: dispenseOffsetFromBottomMm,
              dispenseOffsetFromBottomMm,
              aspirateFlowRateUlSec,
              dispenseFlowRateUlSec,
              aspirateDelaySeconds: aspirateDelay?.seconds,
              dispenseDelaySeconds: dispenseDelay?.seconds,
              tipRack: args.tipRack,
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
        }),
      ]

      const delayAfterDispenseCommands =
        dispenseDelay != null
          ? [
              curryCommandCreator(moveHelper, {
                pipetteId: args.pipette,
                destinationId: args.destLabware,
                well: destinationWell ?? undefined,
                zOffset: dispenseDelay.mmFromBottom,
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

      const blowoutCommand = blowoutUtil({
        pipette: args.pipette,
        sourceLabwareId: args.sourceLabware,
        sourceWell: sourceWellChunk[0],
        destLabwareId: args.destLabware,
        destWell: destinationWell,
        blowoutLocation: args.blowoutLocation,
        flowRate: blowoutFlowRateUlSec,
        offsetFromTopMm: blowoutOffsetFromTopMm,
        invariantContext,
        prevRobotState,
      })

      const willReuseTip = args.changeTip !== 'always' && !isLastChunk
      const airGapAfterDispenseCommands =
        dispenseAirGapVolume && !willReuseTip
          ? [
              curryCommandCreator(airGapHelper, {
                pipetteId: args.pipette,
                volume: dispenseAirGapVolume,
                destinationId: args.destLabware,
                destWell: destinationWell,
                flowRate: aspirateFlowRateUlSec,
                offsetFromBottomMm: airGapOffsetDestWell,
                tipRack: args.tipRack,
              }),
              ...(aspirateDelay != null
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

      let dropTipCommand = [
        curryCommandCreator(dropTip, {
          pipette: args.pipette,
          dropTipLocation: args.dropTipLocation,
        }),
      ]
      if (isWasteChute) {
        dropTipCommand = wasteChuteCommandsUtil({
          type: 'dropTip',
          pipetteId: args.pipette,
          prevRobotState,
          addressableAreaName: addressableAreaNameWasteChute,
        })
      }
      if (isTrashBin) {
        dropTipCommand = movableTrashCommandsUtil({
          type: 'dropTip',
          pipetteId: args.pipette,
          prevRobotState,
          invariantContext,
        })
      }

      // if using dispense > air gap, drop or change the tip at the end
      const dropTipAfterDispenseAirGap =
        airGapAfterDispenseCommands.length > 0 ? dropTipCommand : []

      const stateNozzles = prevRobotState.pipettes[args.pipette].nozzles
      const configureNozzleLayoutCommand: CurriedCommandCreator[] =
        //  only emit the command if previous nozzle state is different
        is96Channel && args.nozzles != null && args.nozzles !== stateNozzles
          ? [
              curryCommandCreator(configureNozzleLayout, {
                nozzles: args.nozzles,
                pipetteId: args.pipette,
              }),
            ]
          : []

      return [
        ...configureNozzleLayoutCommand,
        ...tipCommands,
        ...configureForVolumeCommand,
        ...mixBeforeCommands,
        ...preWetTipCommands, // NOTE when you both mix-before and pre-wet tip, it's kinda redundant. Prewet is like mixing once.
        ...aspirateCommands,
        ...dispenseCommands,
        ...delayAfterDispenseCommands,
        ...mixAfterCommands,
        ...touchTipAfterDispenseCommands,
        ...blowoutCommand,
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
