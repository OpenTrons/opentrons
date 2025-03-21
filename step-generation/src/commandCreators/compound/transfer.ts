import assert from 'assert'
import zip from 'lodash/zip'
import {
  LOW_VOLUME_PIPETTES,
  GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA,
} from '@opentrons/shared-data'
import * as errorCreators from '../../errorCreators'
import { AIR_GAP_OFFSET_FROM_TOP } from '../../constants'
import { getPipetteWithTipMaxVol } from '../../robotStateSelectors'
import { dropTipInTrash } from './dropTipInTrash'
import {
  blowoutUtil,
  curryCommandCreator,
  airGapHelper,
  reduceCommandCreators,
  getTrashOrLabware,
  dispenseLocationHelper,
  moveHelper,
  getHasWasteChute,
  formatPyStr,
  curryWithoutPython,
  formatPyValue,
  formatPyList,
  indentPyLines,
  SOURCE_WELL_BLOWOUT_DESTINATION,
  DEST_WELL_BLOWOUT_DESTINATION,
} from '../../utils'
import {
  aspirate,
  configureForVolume,
  delay,
  dispense,
  dropTip,
  moveToWell,
  touchTip,
} from '../atomic'
import { airGapInWell } from './airGapInWell'
import { dropTipInWasteChute } from './dropTipInWasteChute'
import { mixUtil } from './mix'
import { replaceTip } from './replaceTip'
import type { CutoutId, NozzleConfigurationStyle } from '@opentrons/shared-data'
import type {
  TransferArgs,
  CurriedCommandCreator,
  CommandCreator,
  CommandCreatorError,
  InnerMixArgs,
  InnerDelayArgs,
  InvariantContext,
  ChangeTipOptions,
} from '../../types'

export function transferUtil(args: {
  pipette: string
  sourceLabware: string
  sourceWell: string
  aspirateOffsetFromBottomMm: number
  aspirateFlowRateUlSec: number
  dispenseFlowRateUlSec: number
  aspirateDelay?: InnerDelayArgs | null
  dispenseDelay?: InnerDelayArgs | null
  tipRack: string
  aspirateXOffset: number
  aspirateYOffset: number
  nozzles: NozzleConfigurationStyle | null
  subTransferVol: number
  touchTipAfterAspirate: boolean
  touchTipAfterAspirateOffsetMmFromTop: number
  touchTipAfterAspirateSpeed: number | null
  touchTipAfterDispense: boolean
  destinationWell: string | null
  destLabware: string
  touchTipAfterDispenseOffsetMmFromTop: number
  touchTipAfterDispenseSpeed: number | null
  dispenseOffsetFromBottomMm: number
  dispenseXOffset: number
  dispenseYOffset: number
  aspirateAirGapVolume: number | null
  blowoutFlowRateUlSec: number
  blowoutOffsetFromTopMm: number
  invariantContext: InvariantContext
  subTransferVolumes: number[]
  sourceWells: string[]
  destWells: string[] | null
  changeTip: ChangeTipOptions
  mixBeforeAspirate?: InnerMixArgs | null
  mixInDestination?: InnerMixArgs | null
  blowoutLocation?: string | null
}): CurriedCommandCreator[] {
  const {
    mixBeforeAspirate, 
    pipette, 
    sourceLabware, 
    sourceWell, 
    aspirateOffsetFromBottomMm, 
    aspirateFlowRateUlSec, 
    dispenseFlowRateUlSec, 
    aspirateDelay, 
    dispenseDelay, 
    tipRack, 
    aspirateXOffset,
    aspirateYOffset,
    nozzles, 
    subTransferVol, 
    touchTipAfterAspirate, 
    touchTipAfterAspirateOffsetMmFromTop, 
    touchTipAfterAspirateSpeed, 
    touchTipAfterDispense, 
    destinationWell, 
    destLabware, 
    touchTipAfterDispenseOffsetMmFromTop, 
    touchTipAfterDispenseSpeed, 
    mixInDestination, 
    dispenseOffsetFromBottomMm, 
    dispenseXOffset,
    dispenseYOffset,
    aspirateAirGapVolume, 
    blowoutLocation, 
    blowoutFlowRateUlSec, 
    blowoutOffsetFromTopMm, 
    invariantContext, 
    subTransferVolumes, 
    sourceWells, 
    destWells, 
    changeTip, 
  } = args

  let pythonBlowoutLocation = 'unsupported'
  if (blowoutLocation === SOURCE_WELL_BLOWOUT_DESTINATION) {
    pythonBlowoutLocation = 'source well'
  } else if (blowoutLocation === DEST_WELL_BLOWOUT_DESTINATION) {
    pythonBlowoutLocation = 'destination well'
  } else if (
    blowoutLocation != null &&
    invariantContext.additionalEquipmentEntities[blowoutLocation] != null
  ) {
    pythonBlowoutLocation = 'trash'
  }

  const hasUnsupportedTransferApiArgs =
    blowoutOffsetFromTopMm !== 0 ||
    touchTipAfterAspirate ||
    touchTipAfterDispense ||
    pythonBlowoutLocation === 'unsupported' ||
    destWells == null ||
    aspirateDelay != null ||
    //DEFAULT_MM_OFFSET_FROM_BOTTOM = 1
    dispenseDelay != null ||
    aspirateOffsetFromBottomMm !== 1 ||
    dispenseOffsetFromBottomMm !== 1 ||
    aspirateAirGapVolume != null ||
    aspirateXOffset !== 0 ||
    aspirateYOffset !== 0 ||
    dispenseXOffset !== 0 ||
    dispenseYOffset !== 0

  const curryCreator = hasUnsupportedTransferApiArgs
    ? curryWithoutPython
    : curryCommandCreator

  const pythonCommandCreator: CurriedCommandCreator = () => {
    const pythonChangeTip =
      changeTip === 'perDest' || changeTip === 'perSource'
        ? 'always'
        : changeTip
    const pipettePythonName =
      invariantContext.pipetteEntities[pipette].pythonName
    const sourceLabwarePythonName =
      invariantContext.labwareEntities[sourceLabware].pythonName
    const destLabwarePythonName =
      invariantContext.labwareEntities[destLabware].pythonName
    const pythonSource = sourceWells.map(
      well => `${sourceLabwarePythonName}[${formatPyStr(well)}]`
    )
    const pythonDest = destWells?.map(
      well => `${destLabwarePythonName}[${formatPyStr(well)}]`
    )

    const pythonArgs = [
      `volume=${formatPyList(subTransferVolumes)}`,
      `source=${formatPyList(pythonSource)}`,
      ...(pythonDest != null ? [`dest=${formatPyList(pythonDest)}`] : []),
      `new_tip=${formatPyStr(pythonChangeTip)}`,
      // TODO :DEFAULT_MM_BLOWOUT_OFFSET_FROM_TOP = 0
      `trash=${formatPyValue(true)}`,
      ...(blowoutLocation != null &&
      blowoutOffsetFromTopMm !== 0 &&
      pythonBlowoutLocation !== 'unsupported'
        ? [`blow_out=${formatPyValue(true)}`]
        : []),
      ...(blowoutLocation != null &&
      blowoutOffsetFromTopMm !== 0 &&
      pythonBlowoutLocation !== 'unsupported'
        ? [`blow_location=${formatPyStr(blowoutLocation)}`]
        : []),
      ...(mixBeforeAspirate != null
        ? [
            `mix_before=(${mixBeforeAspirate.times}, ${mixBeforeAspirate.volume})`,
          ]
        : []),
      ...(mixInDestination != null
        ? [`mix_after=(${mixInDestination.times}, ${mixInDestination.volume})`]
        : []),
    ]
    return {
      commands: [],
      python:
        `${pipettePythonName}.flow_rate.aspirate = ${aspirateFlowRateUlSec}\n` +
        `${pipettePythonName}.flow_rate.dispense = ${dispenseFlowRateUlSec}\n` +
        `${pipettePythonName}.flow_rate.blow_out = ${blowoutFlowRateUlSec}\n` +
        `${pipettePythonName}.transfer(\n${indentPyLines(
          pythonArgs.join(',\n')
        )},\n)`,
    }
  }

  const mixBeforeAspirateCommands =
    mixBeforeAspirate != null
      ? mixUtil({
          pipette,
          labware: sourceLabware,
          well: sourceWell,
          volume: mixBeforeAspirate.volume,
          times: mixBeforeAspirate.times,
          offsetFromBottomMm: aspirateOffsetFromBottomMm,
          aspirateFlowRateUlSec,
          dispenseFlowRateUlSec,
          aspirateDelaySeconds: aspirateDelay?.seconds,
          dispenseDelaySeconds: dispenseDelay?.seconds,
          tipRack,
          xOffset: aspirateXOffset,
          yOffset: aspirateYOffset,
          nozzles,
        })
      : []

  const delayAfterAspirateCommands =
    aspirateDelay != null
      ? [
          curryCreator(moveToWell, {
            pipetteId: pipette,
            labwareId: sourceLabware,
            wellName: sourceWell,
            wellLocation: {
              origin: 'bottom',
              offset: {
                x: 0,
                y: 0,
                z: aspirateDelay.mmFromBottom,
              },
            },
          }),
          curryCreator(delay, {
            seconds: aspirateDelay.seconds,
          }),
        ]
      : []
  const touchTipAfterAspirateCommands = touchTipAfterAspirate
    ? [
        curryCreator(touchTip, {
          pipetteId: pipette,
          labwareId: sourceLabware,
          wellName: sourceWell,
          zOffsetFromTop: touchTipAfterAspirateOffsetMmFromTop,
          ...(touchTipAfterAspirateSpeed != null
            ? { speed: touchTipAfterAspirateSpeed }
            : {}),
        }),
      ]
    : []
  //  can not touch tip in a waste chute
  const touchTipAfterDispenseCommands =
    touchTipAfterDispense && destinationWell != null
      ? [
          curryCreator(touchTip, {
            pipetteId: pipette,
            labwareId: destLabware,
            wellName: destinationWell,
            zOffsetFromTop: touchTipAfterDispenseOffsetMmFromTop,
            ...(touchTipAfterDispenseSpeed != null
              ? { speed: touchTipAfterDispenseSpeed }
              : {}),
          }),
        ]
      : []
  //  can not mix in a waste chute
  const mixInDestinationCommands =
    mixInDestination != null && destinationWell != null
      ? mixUtil({
          pipette,
          labware: destLabware,
          well: destinationWell,
          volume: mixInDestination.volume,
          times: mixInDestination.times,
          offsetFromBottomMm: dispenseOffsetFromBottomMm,
          aspirateFlowRateUlSec,
          dispenseFlowRateUlSec,
          aspirateDelaySeconds: aspirateDelay?.seconds,
          dispenseDelaySeconds: dispenseDelay?.seconds,
          tipRack,
          xOffset: dispenseXOffset,
          yOffset: dispenseYOffset,
          nozzles,
        })
      : []

  const airGapAfterAspirateCommands =
    aspirateAirGapVolume && destinationWell != null
      ? [
          curryCreator(airGapInWell, {
            pipetteId: pipette,
            labwareId: sourceLabware,
            wellName: sourceWell,
            volume: aspirateAirGapVolume,
            flowRate: aspirateFlowRateUlSec,
            type: 'aspirate',
          }),
          ...(aspirateDelay != null
            ? [
                curryCreator(delay, {
                  seconds: aspirateDelay.seconds,
                }),
              ]
            : []),
          curryCreator(dispense, {
            pipetteId: pipette,
            volume: aspirateAirGapVolume,
            labwareId: destLabware,
            wellName: destinationWell,
            flowRate: dispenseFlowRateUlSec,
            wellLocation: {
              origin: 'top',
              offset: {
                z: AIR_GAP_OFFSET_FROM_TOP,
                x: 0,
                y: 0,
              },
            },
            isAirGap: true,
            tipRack,
            nozzles,
          }),
          ...(dispenseDelay != null
            ? [
                curryCreator(delay, {
                  seconds: dispenseDelay.seconds,
                }),
              ]
            : []),
        ]
      : []

  const aspirateCommand = [
    curryCreator(aspirate, {
      pipetteId: pipette,
      volume: subTransferVol,
      labwareId: sourceLabware,
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
      tipRack,
      nozzles,
    }),
  ]
  const dispenseCommand = [
    curryCreator(dispenseLocationHelper, {
      pipetteId: pipette,
      volume: subTransferVol,
      destinationId: destLabware,
      well: destinationWell ?? undefined,
      flowRate: dispenseFlowRateUlSec,
      offsetFromBottomMm: dispenseOffsetFromBottomMm,
      xOffset: dispenseXOffset,
      yOffset: dispenseYOffset,
      tipRack,
      nozzles,
    }),
  ]

  const delayAfterDispenseCommands =
    dispenseDelay != null
      ? [
          curryCreator(moveHelper, {
            pipetteId: pipette,
            destinationId: destLabware,
            well: destinationWell ?? undefined,
            zOffset: dispenseDelay.mmFromBottom,
          }),
          curryCreator(delay, {
            seconds: dispenseDelay.seconds,
          }),
        ]
      : []

  //  TODO: need to allow for curry without python for the blowoutInWell command
  const blowoutCommand = blowoutUtil({
    pipette,
    sourceLabwareId: sourceLabware,
    sourceWell: sourceWell,
    destLabwareId: destLabware,
    destWell: destinationWell,
    blowoutLocation,
    flowRate: blowoutFlowRateUlSec,
    offsetFromTopMm: blowoutOffsetFromTopMm,
    invariantContext,
  })

  return [
    ...mixBeforeAspirateCommands,
    ...aspirateCommand,
    ...delayAfterAspirateCommands,
    ...touchTipAfterAspirateCommands,
    ...airGapAfterAspirateCommands,
    ...dispenseCommand,
    ...delayAfterDispenseCommands,
    ...mixInDestinationCommands,
    ...blowoutCommand,
    ...touchTipAfterDispenseCommands,
    ...(hasUnsupportedTransferApiArgs ? [] : [pythonCommandCreator]),
  ]
}

export const transfer: CommandCreator<TransferArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  /**
    Transfer will iterate through a set of 1 or more source and destination wells.
    For each pair, it will aspirate from the source well, then dispense into the destination well.
    This pair of 1 source well and 1 dest well is internally called a "sub-transfer".
     If the volume to aspirate from a source well exceeds the max volume of the pipette,
    then each sub-transfer will be chunked into multiple asp-disp, asp-disp commands.
     A single uniform volume will be aspirated from every source well and dispensed into every dest well.
    In other words, all the sub-transfers will use the same uniform volume.
     =====
     For transfer, changeTip means:
    * 'always': before each aspirate, get a fresh tip
    * 'once': get a new tip at the beginning of the transfer step, and use it throughout
    * 'never': reuse the tip from the last step
    * 'perSource': change tip each time you encounter a new source well (including the first one)
    * 'perDest': change tip each time you encounter a new destination well (including the first one)
    NOTE: In some situations, different changeTip options have equivalent outcomes. That's OK.
  */

  // TODO: BC 2019-07-08 these argument names are a bit misleading, instead of being values bound
  // to the action of aspiration of dispensing in a given command, they are actually values bound
  // to a given labware associated with a command (e.g. Source, Destination). For this reason we
  // currently remapping the inner mix values. Those calls to mixUtil should become easier to read
  // when we decide to rename these fields/args... probably all the way up to the UI level.
  const {
    aspirateDelay,
    dispenseDelay,
    aspirateFlowRateUlSec,
    aspirateOffsetFromBottomMm,
    blowoutFlowRateUlSec,
    blowoutOffsetFromTopMm,
    dispenseFlowRateUlSec,
    dispenseOffsetFromBottomMm,
    tipRack,
    aspirateXOffset,
    aspirateYOffset,
    destLabware,
    sourceLabware,
    dispenseXOffset,
    dispenseYOffset,
  } = args

  const trashOrLabware = getTrashOrLabware(
    invariantContext.labwareEntities,
    invariantContext.additionalEquipmentEntities,
    args.destLabware
  )

  if (
    (trashOrLabware === 'labware' &&
      args.destWells != null &&
      args.sourceWells.length === args.destWells.length) ||
    ((trashOrLabware === 'wasteChute' || trashOrLabware === 'trashBin') &&
      args.destWells == null &&
      args.sourceWells.length >= 1)
  ) {
    // No assertion failure, continue with the logic
  } else {
    assert(
      false,
      `Transfer command creator expected N:N source-to-dest wells ratio. Got ${args.sourceWells.length}:${args.destWells?.length} in labware`
    )
  }

  // TODO Ian 2018-04-02 following ~10 lines are identical to first lines of consolidate.js...
  const actionName = 'transfer'
  const errors: CommandCreatorError[] = []

  if (
    !prevRobotState.pipettes[args.pipette] ||
    !invariantContext.pipetteEntities[args.pipette]
  ) {
    // bail out before doing anything else
    errors.push(
      errorCreators.pipetteDoesNotExist({
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

  const initialDestLabwareSlot = prevRobotState.labware[destLabware]?.slot
  const initialSourceLabwareSlot = prevRobotState.labware[sourceLabware]?.slot
  const hasWasteChute = getHasWasteChute(
    invariantContext.additionalEquipmentEntities
  )

  if (
    hasWasteChute &&
    (initialDestLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA ||
      initialSourceLabwareSlot === GRIPPER_WASTE_CHUTE_ADDRESSABLE_AREA)
  ) {
    errors.push(errorCreators.labwareDiscarded())
  }

  if (
    !args.destLabware ||
    (!invariantContext.labwareEntities[args.destLabware] &&
      !invariantContext.additionalEquipmentEntities[args.destLabware])
  ) {
    errors.push(errorCreators.equipmentDoesNotExist())
  }

  if (
    !args.dropTipLocation ||
    !invariantContext.additionalEquipmentEntities[args.dropTipLocation]
  ) {
    errors.push(errorCreators.dropTipLocationDoesNotExist())
  }

  if (errors.length > 0)
    return {
      errors,
    }
  const pipetteSpec = invariantContext.pipetteEntities[args.pipette].spec

  const dropTipEntity =
    invariantContext.additionalEquipmentEntities[args.dropTipLocation]
  const isWasteChute = dropTipEntity?.name === 'wasteChute'
  const isTrashBin = dropTipEntity?.name === 'trashBin'

  const aspirateAirGapVolume = args.aspirateAirGapVolume || 0
  const dispenseAirGapVolume = args.dispenseAirGapVolume || 0
  const effectiveTransferVol =
    getPipetteWithTipMaxVol(args.pipette, invariantContext, tipRack) -
    aspirateAirGapVolume
  const liquidMinVolumes = Object.values(pipetteSpec.liquids).map(
    liquid => liquid.minVolume
  )
  //  account for minVolume for lowVolume pipettes
  const pipetteMinVol = Math.min(...liquidMinVolumes)
  const chunksPerSubTransfer = Math.ceil(args.volume / effectiveTransferVol)
  const lastSubTransferVol =
    args.volume - (chunksPerSubTransfer - 1) * effectiveTransferVol
  // volume of each chunk in a sub-transfer
  let subTransferVolumes: number[] = Array(chunksPerSubTransfer - 1)
    .fill(effectiveTransferVol)
    .concat(lastSubTransferVol)

  if (chunksPerSubTransfer > 1 && lastSubTransferVol < pipetteMinVol) {
    // last chunk volume is below pipette min, split the last
    const splitLastVol = (effectiveTransferVol + lastSubTransferVol) / 2
    subTransferVolumes = Array(chunksPerSubTransfer - 2)
      .fill(effectiveTransferVol)
      .concat(splitLastVol)
      .concat(splitLastVol)
  }

  // @ts-expect-error(SA, 2021-05-05): zip can return undefined so this really should be Array<[string | undefined, string | undefined]>
  const sourceDestPairs: Array<[string, string | null]> = zip(
    args.sourceWells,
    args.destWells
  )
  let prevSourceWell: string | null = null
  let prevDestWell: string | null = null
  const commandCreators = sourceDestPairs.reduce(
    (
      outerAcc: CurriedCommandCreator[],
      wellPair: [string, string | null],
      pairIdx: number
    ): CurriedCommandCreator[] => {
      const [sourceWell, destinationWell] = wellPair
      const commands = subTransferVolumes.reduce(
        (
          innerAcc: CurriedCommandCreator[],
          subTransferVol: number,
          chunkIdx: number
        ): CurriedCommandCreator[] => {
          const isInitialSubtransfer = pairIdx === 0 && chunkIdx === 0
          const isLastPair = pairIdx + 1 === sourceDestPairs.length
          const isLastChunk = chunkIdx + 1 === subTransferVolumes.length
          let changeTipNow = false // 'never' by default

          if (args.changeTip === 'always') {
            changeTipNow = true
          } else if (args.changeTip === 'once') {
            changeTipNow = isInitialSubtransfer
          } else if (args.changeTip === 'perSource') {
            changeTipNow = sourceWell !== prevSourceWell
          } else if (args.changeTip === 'perDest') {
            changeTipNow =
              isInitialSubtransfer || destinationWell !== prevDestWell
          }

          const configureForVolumeCommand: CurriedCommandCreator[] = LOW_VOLUME_PIPETTES.includes(
            invariantContext.pipetteEntities[args.pipette].name
          )
            ? [
                curryCommandCreator(configureForVolume, {
                  pipetteId: args.pipette,
                  volume: subTransferVol,
                }),
              ]
            : []

          const tipCommands: CurriedCommandCreator[] = changeTipNow
            ? [
                curryCommandCreator(replaceTip, {
                  pipette: args.pipette,
                  nozzles: args.nozzles ?? undefined,
                  dropTipLocation: args.dropTipLocation,
                  tipRack: args.tipRack,
                }),
              ]
            : []
          const preWetTipCommands =
            args.preWetTip && chunkIdx === 0
              ? mixUtil({
                  pipette: args.pipette,
                  labware: args.sourceLabware,
                  well: sourceWell,
                  volume: subTransferVol,
                  times: 1,
                  offsetFromBottomMm: aspirateOffsetFromBottomMm,
                  aspirateFlowRateUlSec,
                  dispenseFlowRateUlSec,
                  aspirateDelaySeconds: aspirateDelay?.seconds,
                  dispenseDelaySeconds: dispenseDelay?.seconds,
                  tipRack,
                  xOffset: aspirateXOffset,
                  yOffset: aspirateYOffset,
                  nozzles: args.nozzles,
                })
              : []

          // `willReuseTip` is like changeTipNow, but thinking ahead about
          //  the NEXT subtransfer and not this current one
          let willReuseTip = true // never or once --> true

          if (isLastChunk && isLastPair) {
            // if we're at the end of this step, we won't reuse the tip in this step
            // so we can discard it (even if changeTip is never, we'll drop it!)
            willReuseTip = false
          } else if (args.changeTip === 'always') {
            willReuseTip = false
          } else if (args.changeTip === 'perSource' && !isLastPair) {
            const nextSourceWell = sourceDestPairs[pairIdx + 1][0]
            willReuseTip = nextSourceWell === sourceWell
          } else if (args.changeTip === 'perDest' && !isLastPair) {
            const nextDestWell = sourceDestPairs[pairIdx + 1][1]
            willReuseTip = nextDestWell === destinationWell
          }

          const airGapAfterDispenseCommands =
            dispenseAirGapVolume && !willReuseTip
              ? [
                  curryCommandCreator(airGapHelper, {
                    sourceWell,
                    blowOutLocation: args.blowoutLocation,
                    sourceId: args.sourceLabware,
                    pipetteId: args.pipette,
                    volume: dispenseAirGapVolume,
                    destinationId: args.destLabware,
                    destWell: destinationWell,
                    flowRate: aspirateFlowRateUlSec,
                    offsetFromTopMm: AIR_GAP_OFFSET_FROM_TOP,
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
                wasteChuteId: dropTipEntity.id,
              }),
            ]
          }
          if (isTrashBin) {
            dropTipCommand = [
              curryCommandCreator(dropTipInTrash, {
                pipetteId: args.pipette,
                trashLocation: dropTipEntity.location as CutoutId,
              }),
            ]
          }

          // if using dispense > air gap, drop or change the tip at the end
          const dropTipAfterDispenseAirGap =
            airGapAfterDispenseCommands.length > 0 && isLastChunk && isLastPair
              ? dropTipCommand
              : []

          const transferCommands = transferUtil({
            mixBeforeAspirate: args.mixBeforeAspirate,
            pipette: args.pipette,
            sourceLabware,
            sourceWell,
            aspirateOffsetFromBottomMm,
            aspirateFlowRateUlSec,
            dispenseFlowRateUlSec,
            aspirateDelay,
            dispenseDelay,
            tipRack,
            aspirateXOffset,
            aspirateYOffset,
            nozzles: args.nozzles,
            subTransferVol,
            touchTipAfterAspirate: args.touchTipAfterAspirate,
            touchTipAfterAspirateOffsetMmFromTop:
              args.touchTipAfterAspirateOffsetMmFromTop,
            touchTipAfterAspirateSpeed: args.touchTipAfterAspirateSpeed,
            touchTipAfterDispense: args.touchTipAfterDispense,
            destinationWell,
            destLabware,
            touchTipAfterDispenseOffsetMmFromTop:
              args.touchTipAfterDispenseOffsetMmFromTop,
            touchTipAfterDispenseSpeed: args.touchTipAfterDispenseSpeed,
            mixInDestination: args.mixInDestination,
            dispenseOffsetFromBottomMm,
            dispenseXOffset,
            dispenseYOffset,
            aspirateAirGapVolume,
            blowoutLocation: args.blowoutLocation,
            blowoutFlowRateUlSec,
            blowoutOffsetFromTopMm,
            invariantContext,
            subTransferVolumes,
            sourceWells: args.sourceWells,
            destWells: args.destWells,
            changeTip: args.changeTip,
          })

          const nextCommands = [
            ...tipCommands,
            ...preWetTipCommands,
            ...configureForVolumeCommand,
            ...transferCommands,
            ...airGapAfterDispenseCommands,
            ...dropTipAfterDispenseAirGap,
          ]
          // NOTE: side-effecting
          prevSourceWell = sourceWell
          prevDestWell = destinationWell
          return [...innerAcc, ...nextCommands]
        },
        []
      )
      return [...outerAcc, ...commands]
    },
    []
  )
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
