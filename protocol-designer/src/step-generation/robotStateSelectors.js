// @flow
import {tiprackWellNamesByCol, tiprackWellNamesFlat} from './'
import type {Channels} from '@opentrons/components'
import type {RobotState} from './'
import sortBy from 'lodash/sortBy'

// SELECTOR UTILITIES

export function sortLabwareBySlot (robotState: RobotState) {
  return sortBy(Object.keys(robotState.labware), id => parseInt(robotState.labware[id].slot))
}

// SELECTORS

export function _getNextTip (
  pipetteChannels: Channels,
  tiprackWellsState: {[wellName: string]: boolean
}): string | null {
  /** Given a tiprack's wells state, return the well of the next available tip
    NOTE: expects 96-well tiprack
  */
  const hasTiprack = wellName => tiprackWellsState[wellName]

  if (pipetteChannels === 1) {
    const well = tiprackWellNamesFlat.find(hasTiprack)
    return well || null
  }

  // Otherwise, pipetteChannels === 8.
  // return first well in the column (for 96-well format, the 'A' row)
  const fullColumn = tiprackWellNamesByCol.find(wellNamesInCol => wellNamesInCol.every(hasTiprack))
  return fullColumn ? fullColumn[0] : null
}

export function getNextTiprack (pipetteChannels: Channels, robotState: RobotState) {
  /** Returns the next tiprack that has tips.
    Tipracks are any labwareIds that exist in tipState.tipracks.
    For 8-channel pipette, tipracks need a full column of tips.
    If there are no available tipracks, returns null.
  */

  const sortedTipracksIds = sortLabwareBySlot(robotState).filter(labwareId =>
    robotState.tipState.tipracks[labwareId]
  )

  const firstAvailableTiprack = sortedTipracksIds.find(tiprackId =>
    _getNextTip(pipetteChannels, robotState.tipState.tipracks[tiprackId])
  )

  // TODO Ian 2018-02-12: avoid calling _getNextTip twice
  const nextTip = firstAvailableTiprack &&
    _getNextTip(pipetteChannels, robotState.tipState.tipracks[firstAvailableTiprack])

  if (firstAvailableTiprack && nextTip) {
    return {
      tiprackId: firstAvailableTiprack,
      well: nextTip
    }
  }
  // No available tipracks (for given pipette channels)
  return null
}
