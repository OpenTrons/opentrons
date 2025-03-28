import { dispenseUpdateLiquidState } from './dispenseUpdateLiquidState'

import type {
  AspirateInPlaceParams,
  BlowoutInPlaceParams,
  DispenseInPlaceParams,
  DropTipInPlaceParams,
} from '@opentrons/shared-data'
import type { InvariantContext, RobotStateAndWarnings } from '../types'

export const forAspirateInPlace = (
  params: AspirateInPlaceParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void => {
  //  aspirateInPlace is only used for air_gap so there are no state
  //  updates
}

export const forDispenseInPlace = (
  params: DispenseInPlaceParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void => {
  const { pipetteId, volume } = params
  const { robotState } = robotStateAndWarnings
  dispenseUpdateLiquidState({
    invariantContext,
    pipetteId,
    prevLiquidState: robotState.liquidState,
    useFullVolume: false,
    volume,
    robotStateAndWarnings,
  })
}

export const forBlowOutInPlace = (
  params: BlowoutInPlaceParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void => {
  const { pipetteId } = params
  const { robotState } = robotStateAndWarnings
  dispenseUpdateLiquidState({
    invariantContext,
    pipetteId,
    prevLiquidState: robotState.liquidState,
    useFullVolume: true,
    robotStateAndWarnings,
  })
}

export const forDropTipInPlace = (
  params: DropTipInPlaceParams,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void => {
  const { pipetteId } = params
  const { robotState } = robotStateAndWarnings
  robotState.tipState.pipettes[pipetteId] = false

  dispenseUpdateLiquidState({
    invariantContext,
    prevLiquidState: robotState.liquidState,
    pipetteId,
    useFullVolume: true,
    robotStateAndWarnings,
  })
}
