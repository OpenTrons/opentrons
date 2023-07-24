import assert from 'assert'
// TODO: Ian 2019-04-18 move orderWells somewhere more general -- shared-data util?
import { orderWells } from './utils/orderWells'
import min from 'lodash/min'
import sortBy from 'lodash/sortBy'
import {
  getLabwareDefURI,
  getTiprackVolume,
  THERMOCYCLER_MODULE_TYPE,
} from '@opentrons/shared-data'
import type {
  InvariantContext,
  ModuleTemporalProperties,
  RobotState,
  ThermocyclerModuleState,
} from './'
export function sortLabwareBySlot(
  labwareState: RobotState['labware']
): string[] {
  return sortBy<string>(Object.keys(labwareState), (id: string) =>
    parseInt(labwareState[id].slot)
  )
}
export function _getNextTip(args: {
  pipetteId: string
  tiprackId: string
  invariantContext: InvariantContext
  robotState: RobotState
}): string | null {
  // return the well name of the next available tip for a pipette (or null)
  const { pipetteId, tiprackId, invariantContext, robotState } = args
  const pipetteChannels =
    invariantContext.pipetteEntities[pipetteId]?.spec?.channels
  const tiprackWellsState = robotState.tipState.tipracks[tiprackId]
  const tiprackDef = invariantContext.labwareEntities[tiprackId]?.def

  const hasTip = (wellName: string): boolean => tiprackWellsState[wellName]

  const orderedWells = orderWells(tiprackDef.ordering, 't2b', 'l2r')

  if (pipetteChannels === 1) {
    const well = orderedWells.find(hasTip)
    return well || null
  }

  if (pipetteChannels === 8) {
    // Otherwise, pipetteChannels === 8.
    // return first well in the column (for 96-well format, the 'A' row)
    const tiprackColumns = tiprackDef.ordering
    const fullColumn = tiprackColumns.find(col => col.every(hasTip))
    return fullColumn != null ? fullColumn[0] : null
  }

  assert(false, `Pipette ${pipetteId} has no channels/spec, cannot _getNextTip`)
  return null
}
type NextTiprack = {
  tiprackId: string
  well: string
} | null
export function getNextTiprack(
  pipetteId: string,
  tipRack: string,
  invariantContext: InvariantContext,
  robotState: RobotState
): NextTiprack {
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
      assert(
        invariantContext.labwareEntities[labwareId]?.labwareDefURI,
        `cannot getNextTiprack, no labware entity for "${labwareId}"`
      )
      const isOnDeck = robotState.labware[labwareId].slot != null

      return isOnDeck && labwareId === tipRack
    }
  )
  const firstAvailableTiprack = sortedTipracksIds.find(tiprackId =>
    _getNextTip({
      pipetteId,
      tiprackId,
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
      invariantContext,
      robotState,
    })

  if (firstAvailableTiprack && nextTip) {
    return {
      tiprackId: firstAvailableTiprack,
      well: nextTip,
    }
  }

  // No available tipracks (for given pipette channels)
  return null
}
export function getPipetteWithTipMaxVol(
  pipetteId: string,
  invariantContext: InvariantContext,
  tipRack: string
): number {
  // NOTE: this fn assumes each pipette is assigned to exactly one tiprack type,
  // across the entire timeline
  const pipetteEntity = invariantContext.pipetteEntities[pipetteId]
  const pipetteMaxVol = pipetteEntity.spec.maxVolume
  const tiprackDef = pipetteEntity.tiprackLabwareDef
  const tipRackDefUri = tipRack?.split(':')[1]
  let chosenTipRack = null
  for (const def of tiprackDef) {
    if (getLabwareDefURI(def) === tipRackDefUri) {
      chosenTipRack = def
      break
    }
  }
  const tiprackTipVol = getTiprackVolume(chosenTipRack ?? tiprackDef[0])

  if (!pipetteMaxVol || !tiprackTipVol) {
    assert(
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
