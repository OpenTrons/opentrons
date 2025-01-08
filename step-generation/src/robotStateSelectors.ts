// TODO: Ian 2019-04-18 move orderWells somewhere more general -- shared-data util?
import min from 'lodash/min'
import {
  ABSORBANCE_READER_TYPE,
  ALL,
  COLUMN,
  getLabwareDefURI,
  getTiprackVolume,
  orderWells,
  THERMOCYCLER_MODULE_TYPE,
  SINGLE,
} from '@opentrons/shared-data'
import { COLUMN_4_SLOTS } from './constants'
import type {
  AbsorbanceReaderState,
  InvariantContext,
  ModuleTemporalProperties,
  RobotState,
  ThermocyclerModuleState,
} from './types'
import type { NozzleConfigurationStyle } from '@opentrons/shared-data'

export function sortLabwareBySlot(
  labwareState: RobotState['labware']
): string[] {
  const sortedLabware = Object.keys(labwareState).sort(
    (idA: string, idB: string) => {
      const slotA = parseInt(labwareState[idA].slot)
      const slotB = parseInt(labwareState[idB].slot)
      if (
        COLUMN_4_SLOTS.includes(labwareState[idA].slot) &&
        COLUMN_4_SLOTS.includes(labwareState[idB].slot)
      ) {
        return idA.localeCompare(idB)
      }
      if (COLUMN_4_SLOTS.includes(labwareState[idA].slot)) {
        return 1
      }
      if (COLUMN_4_SLOTS.includes(labwareState[idB].slot)) {
        return -1
      }
      return slotA - slotB
    }
  )

  return sortedLabware
}

export function _getNextTip(args: {
  pipetteId: string
  tiprackId: string
  invariantContext: InvariantContext
  robotState: RobotState
  nozzles?: NozzleConfigurationStyle
}): string | null {
  // return the well name of the next available tip for a pipette (or null)
  const { pipetteId, tiprackId, invariantContext, robotState, nozzles } = args
  const pipetteChannels =
    invariantContext.pipetteEntities[pipetteId]?.spec?.channels
  const tiprackWellsState = robotState.tipState.tipracks[tiprackId]
  const tiprackDef = invariantContext.labwareEntities[tiprackId]?.def

  const hasTip = (wellName: string): boolean => tiprackWellsState[wellName]
  console.log(nozzles)
  const orderedWells = orderWells(tiprackDef.ordering, 't2b', 'l2r')
  if (pipetteChannels === 1 || nozzles === SINGLE) {
    const well = orderedWells.find(hasTip)
    return well || null
  }

  if (pipetteChannels === 8 || (pipetteChannels === 96 && nozzles === COLUMN)) {
    // return first well in the column (for 96-well format, the 'A' row)
    const tiprackColumns = tiprackDef.ordering
    const fullColumn = tiprackColumns.find(col => col.every(hasTip))
    return fullColumn != null ? fullColumn[0] : null
  }
  if (pipetteChannels === 96 && nozzles === ALL) {
    const allWellsHaveTip = orderedWells.every(hasTip)
    return allWellsHaveTip ? orderedWells[0] : null
  }

  console.assert(
    false,
    `Pipette ${pipetteId} has no channels/spec, cannot _getNextTip`
  )
  return null
}
interface NextTiprackInfo {
  nextTiprack: {
    tiprackId: string
    well: string
  } | null
  tipracks: { totalTipracks: number; filteredTipracks: number }
}
export function getNextTiprack(
  pipetteId: string,
  tipRackUri: string,
  invariantContext: InvariantContext,
  robotState: RobotState,
  nozzles?: NozzleConfigurationStyle
): NextTiprackInfo {
  /** Returns the next tiprack that has tips.
    Tipracks are any labwareIds that exist in tipState.tipracks.
    For 8-channel pipette, tipracks need a full column of tips.
    If there are no available tipracks, returns null.
  */
  const pipetteEntity = invariantContext.pipetteEntities[pipetteId]

  if (!pipetteEntity) {
    throw new Error(
      `cannot getNextTiprack, no pipette entity for pipette "${pipetteId}"`
    )
  }

  // filter out unmounted or non-compatible tiprack models
  const sortedTipracksIds = sortLabwareBySlot(robotState.labware).filter(
    labwareId => {
      console.assert(
        invariantContext.labwareEntities[labwareId]?.labwareDefURI,
        `cannot getNextTiprack, no labware entity for "${labwareId}"`
      )
      const isOnDeck = robotState.labware[labwareId].slot != null
      const labwareIdDefUri =
        invariantContext.labwareEntities[labwareId].labwareDefURI
      return isOnDeck && labwareIdDefUri === tipRackUri
    }
  )
  const is96Channel = pipetteEntity.spec.channels === 96
  const filteredSortedTipRackIdsFor96Channel = sortedTipracksIds.filter(
    tiprackId => {
      const tipRackLocation = robotState.labware[tiprackId].slot
      const adapterEntity = invariantContext.labwareEntities[tipRackLocation]
      const has96TiprackAdapterId =
        adapterEntity?.def.parameters.loadName ===
          'opentrons_flex_96_tiprack_adapter' &&
        adapterEntity?.def.namespace === 'opentrons'

      return nozzles === ALL ? has96TiprackAdapterId : !has96TiprackAdapterId
    }
  )
  const firstAvailableTiprack = (is96Channel
    ? filteredSortedTipRackIdsFor96Channel
    : sortedTipracksIds
  ).find(tiprackId =>
    _getNextTip({
      pipetteId,
      tiprackId,
      nozzles,
      invariantContext,
      robotState,
    })
  )
  // TODO Ian 2018-02-12: avoid calling _getNextTip twice
  const nextTip =
    firstAvailableTiprack &&
    _getNextTip({
      pipetteId,
      tiprackId: firstAvailableTiprack,
      nozzles,
      invariantContext,
      robotState,
    })

  if (firstAvailableTiprack && nextTip) {
    return {
      nextTiprack: {
        tiprackId: firstAvailableTiprack,
        well: nextTip,
      },
      tipracks: {
        totalTipracks: sortedTipracksIds.length,
        filteredTipracks: filteredSortedTipRackIdsFor96Channel.length,
      },
    }
  }

  // No available tipracks (for given pipette channels) but keep track of tiprack numbers
  // for 96-channel and tiprack adapters
  return {
    nextTiprack: null,
    tipracks: {
      totalTipracks: sortedTipracksIds.length,
      filteredTipracks: filteredSortedTipRackIdsFor96Channel.length,
    },
  }
}
export function getPipetteWithTipMaxVol(
  pipetteId: string,
  invariantContext: InvariantContext,
  tipRackDefUri: string
): number {
  // NOTE: this fn assumes each pipette is assigned to exactly one tiprack type,
  // across the entire timeline
  const pipetteEntity = invariantContext.pipetteEntities[pipetteId]
  const pipetteMaxVol = pipetteEntity.spec.liquids.default.maxVolume
  const tiprackDef = pipetteEntity.tiprackLabwareDef
  let chosenTipRack = null
  for (const def of tiprackDef) {
    if (getLabwareDefURI(def) === tipRackDefUri) {
      chosenTipRack = def
      break
    }
  }
  const tiprackTipVol = getTiprackVolume(chosenTipRack ?? tiprackDef[0])

  if (!pipetteMaxVol || !tiprackTipVol) {
    console.assert(
      false,
      `getPipetteEffectiveMaxVol expected tiprackMaxVol and pipette maxVolume to be > 0, got',
      ${pipetteMaxVol}, ${tiprackTipVol}`
    )
    return NaN
  }
  // @ts-expect-error(SA, 2021-05-03): ts thinks these might be falsy even though we're doing an assert above
  return min([tiprackTipVol, pipetteMaxVol])
}
export function getModuleState(
  robotState: RobotState,
  module: string
): ModuleTemporalProperties['moduleState'] {
  if (!(module in robotState.modules)) {
    console.warn(
      `getModuleState expected module id "${module}" to be in robot state`
    )
  }

  return robotState.modules[module]?.moduleState
}
export const thermocyclerStateGetter = (
  robotState: RobotState,
  moduleId: string
): ThermocyclerModuleState | null => {
  const hardwareModule = robotState.modules[moduleId]?.moduleState
  return hardwareModule && hardwareModule.type === THERMOCYCLER_MODULE_TYPE
    ? hardwareModule
    : null
}

// TODO: refactor this and above utility into one
export const absorbanceReaderStateGetter = (
  robotState: RobotState,
  moduleId: string
): AbsorbanceReaderState | null => {
  const hardwareModule = robotState.modules[moduleId]?.moduleState
  return hardwareModule && hardwareModule.type === ABSORBANCE_READER_TYPE
    ? hardwareModule
    : null
}
