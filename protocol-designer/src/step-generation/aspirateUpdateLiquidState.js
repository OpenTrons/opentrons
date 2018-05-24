// @flow
import range from 'lodash/range'
import {mergeLiquid, splitLiquid, getWellsForTips} from './utils'
import type {RobotState, PipetteData, SingleLabwareLiquidState} from './'

type LiquidState = $PropertyType<RobotState, 'liquidState'>

export default function updateLiquidState (
  args: {
    pipetteId: string,
    pipetteData: PipetteData,
    volume: number,
    labwareId: string,
    labwareType: string,
    well: string
  },
  prevLiquidState: LiquidState
) {
  const {pipetteId, pipetteData, volume, labwareId, labwareType, well} = args
  const {wellsForTips} = getWellsForTips(pipetteData.channels, labwareType, well)

  // Blend tip's liquid contents (if any) with liquid of the source
  // to update liquid state in all pipette tips
  const pipetteLiquidState: SingleLabwareLiquidState = range(pipetteData.channels).reduce(
    (acc: SingleLabwareLiquidState, tipIndex) => {
      const prevTipLiquidState = prevLiquidState.pipettes[pipetteId][tipIndex.toString()]
      const prevSourceLiquidState = prevLiquidState.labware[labwareId][wellsForTips[tipIndex]]

      const newLiquidFromWell = splitLiquid(
        volume,
        prevSourceLiquidState
      ).dest

      return {
        ...acc,
        [tipIndex]: mergeLiquid(
          prevTipLiquidState,
          newLiquidFromWell
        )
      }
    }, {})

  // Remove liquid from source well(s)
  const labwareLiquidState: SingleLabwareLiquidState = {
    ...prevLiquidState.labware[labwareId],
    ...wellsForTips.reduce((acc: SingleLabwareLiquidState, well) => ({
      ...acc,
      [well]: splitLiquid(
        volume,
        // When multiple tips aspirate from 1 well,
        // that volume is sequentially removed, tip by tip
        acc[well] || prevLiquidState.labware[labwareId][well]
      ).source
    }), {})
  }

  const nextLiquidState = {
    pipettes: {
      ...prevLiquidState.pipettes,
      [pipetteId]: pipetteLiquidState
    },
    labware: {
      ...prevLiquidState.labware,
      [labwareId]: labwareLiquidState
    }
  }

  return nextLiquidState
}
