import mapValues from 'lodash/mapValues'
import reduce from 'lodash/reduce'
import { COLUMN, SINGLE } from '@opentrons/shared-data'
import {
  splitLiquid,
  mergeLiquid,
  getWellsForTips,
  getLocationTotalVolume,
} from '../utils/misc'
import type {
  RobotState,
  InvariantContext,
  LocationLiquidState,
  SourceAndDest,
  RobotStateAndWarnings,
} from '../types'

type LiquidState = RobotState['liquidState']
export interface DispenseUpdateLiquidStateArgs {
  invariantContext: InvariantContext
  prevLiquidState: LiquidState
  pipetteId: string
  // volume value is required when useFullVolume is false
  useFullVolume: boolean
  robotStateAndWarnings: RobotStateAndWarnings
  wellName?: string
  labwareId?: string
  volume?: number
}

/** This is a helper to do dispense/blowout liquid state updates. */
export function dispenseUpdateLiquidState(
  args: DispenseUpdateLiquidStateArgs
): void {
  const {
    robotStateAndWarnings,
    invariantContext,
    labwareId,
    pipetteId,
    prevLiquidState,
    useFullVolume,
    volume,
    wellName,
  } = args
  const pipetteSpec = invariantContext.pipetteEntities[pipetteId].spec
  const nozzles = robotStateAndWarnings.robotState.pipettes[pipetteId].nozzles
  let channels = pipetteSpec.channels
  if (nozzles === COLUMN) {
    channels = 8
  } else if (nozzles === SINGLE) {
    channels = 1
  }
  const trashId = Object.values(
    invariantContext.additionalEquipmentEntities
  ).find(aE => aE.name === 'wasteChute' || aE.name === 'trashBin')?.id

  const sourceId =
    labwareId != null
      ? invariantContext.labwareEntities[labwareId].id
      : trashId ?? ''

  if (sourceId === '') {
    console.error(
      `expected to find a trash entity id but could not, with trash id ${trashId}`
    )
  }

  const well = wellName ?? null

  const labwareDef =
    labwareId != null ? invariantContext.labwareEntities[labwareId].def : null

  console.assert(
    !(useFullVolume && typeof volume === 'number'),
    'dispenseUpdateLiquidState takes either `volume` or `useFullVolume`, but got both'
  )
  console.assert(
    typeof volume === 'number' || useFullVolume,
    'in dispenseUpdateLiquidState, either volume or useFullVolume are required'
  )
  const { wellsForTips, allWellsShared } =
    labwareDef != null && wellName != null
      ? getWellsForTips(channels, labwareDef, wellName)
      : { wellsForTips: null, allWellsShared: true }

  const liquidLabware =
    prevLiquidState.labware[sourceId] != null
      ? prevLiquidState.labware[sourceId]
      : null
  const liquidTrash =
    prevLiquidState.additionalEquipment[sourceId] != null
      ? prevLiquidState.additionalEquipment[sourceId]
      : null

  // remove liquid from pipette tips,
  // create intermediate object where sources are updated tip liquid states
  // and dests are "droplets" that need to be merged to dest well contents
  const splitLiquidStates: Record<string, SourceAndDest> = mapValues(
    prevLiquidState.pipettes[pipetteId],
    (prevTipLiquidState: LocationLiquidState): SourceAndDest => {
      if (useFullVolume) {
        const totalTipVolume = getLocationTotalVolume(prevTipLiquidState)
        return totalTipVolume > 0
          ? splitLiquid(totalTipVolume, prevTipLiquidState)
          : {
              source: {},
              dest: {},
            }
      }

      return splitLiquid(volume || 0, prevTipLiquidState)
    }
  )

  let mergeLiquidtoSingleWell = null
  //  a labware will always have a well
  if (well != null && liquidLabware != null) {
    mergeLiquidtoSingleWell = {
      [well]: reduce(
        splitLiquidStates,
        (wellLiquidStateAcc, splitLiquidStateForTip: SourceAndDest) => {
          const res = mergeLiquid(
            wellLiquidStateAcc,
            splitLiquidStateForTip.dest
          )
          return res
        },
        liquidLabware[well]
      ),
    }
  }
  //  waste chute and trash bin don't have wells
  if (well == null && liquidTrash != null) {
    mergeLiquidtoSingleWell = reduce(
      splitLiquidStates,
      (wellLiquidStateAcc, splitLiquidStateForTip: SourceAndDest) => {
        const res = mergeLiquid(wellLiquidStateAcc, splitLiquidStateForTip.dest)
        return res
      },
      liquidTrash
    )
  }

  if (mergeLiquidtoSingleWell == null) {
    console.assert(
      `expected to merge liquid to a single well with sourceId ${sourceId}`
    )
  }

  const mergeTipLiquidToOwnWell =
    well != null && liquidLabware != null && wellsForTips != null
      ? wellsForTips.reduce((acc, wellForTip, tipIdx) => {
          return {
            ...acc,
            [wellForTip]: mergeLiquid(
              splitLiquidStates[`${tipIdx}`].dest,
              liquidLabware[wellForTip] || {} // TODO Ian 2018-04-02 use robotState selector. (Liquid state falls back to {} for empty well)
            ),
          }
        }, {})
      : {}

  // add liquid to well(s)
  const labwareLiquidState = allWellsShared
    ? mergeLiquidtoSingleWell
    : mergeTipLiquidToOwnWell
  prevLiquidState.pipettes[pipetteId] = mapValues(splitLiquidStates, 'source')
  if (
    prevLiquidState.additionalEquipment[sourceId] != null &&
    labwareLiquidState != null
  ) {
    prevLiquidState.additionalEquipment[sourceId] = Object.assign(
      labwareLiquidState
    )
  } else if (
    prevLiquidState.labware[sourceId] != null &&
    labwareLiquidState != null
  ) {
    prevLiquidState.labware[sourceId] = Object.assign(
      liquidLabware ?? {},
      labwareLiquidState
    )
  }
}
