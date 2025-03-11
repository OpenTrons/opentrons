import assert from 'assert'
import produce from 'immer'
import { stripNoOpCommands } from '../utils/stripNoOpCommands'
import { forLoadLiquid } from './forLoadLiquid'
import { forAspirate } from './forAspirate'
import { forDispense } from './forDispense'
import { forBlowout } from './forBlowout'
import { forDropTip } from './forDropTip'
import { forPickUpTip } from './forPickUpTip'
import { forEngageMagnet, forDisengageMagnet } from './magnetUpdates'
import {
  forThermocyclerAwaitBlockTemperature,
  forThermocyclerAwaitLidTemperature,
  forThermocyclerAwaitProfileComplete,
  forThermocyclerCloseLid,
  forThermocyclerDeactivateBlock,
  forThermocyclerDeactivateLid,
  forThermocyclerOpenLid,
  forThermocyclerRunProfile,
  forThermocyclerSetTargetBlockTemperature,
  forThermocyclerSetTargetLidTemperature,
} from './thermocyclerUpdates'
import {
  forAwaitTemperature,
  forSetTemperature,
  forDeactivateTemperature,
} from './temperatureUpdates'
import {
  forHeaterShakerCloseLatch,
  forHeaterShakerDeactivateHeater,
  forHeaterShakerOpenLatch,
  forHeaterShakerSetTargetShakeSpeed,
  forHeaterShakerSetTargetTemperature,
  forHeaterShakerStopShake,
} from './heaterShakerUpdates'
import { forMoveLabware } from './forMoveLabware'
import {
  forAspirateInPlace,
  forBlowOutInPlace,
  forDispenseInPlace,
  forDropTipInPlace,
} from './inPlaceCommandUpdates'
import {
  forAbsorbanceReaderCloseLid,
  forAbsorbanceReaderInitialize,
  forAbsorbanceReaderOpenLid,
} from './absorbanceReaderUpdates'

import type { CreateCommand } from '@opentrons/shared-data'
import type {
  InvariantContext,
  RobotState,
  RobotStateAndWarnings,
} from '../types'
import { forConfigureNozzleLayout } from './forConfigureNozzleLayout'

// WARNING this will mutate the prevRobotState
function _getNextRobotStateAndWarningsSingleCommand(
  command: CreateCommand,
  invariantContext: InvariantContext,
  robotStateAndWarnings: RobotStateAndWarnings
): void {
  assert(command, 'undefined command passed to getNextRobotStateAndWarning')
  switch (command.commandType) {
    case 'aspirate':
      if (command.meta?.isAirGap === true) {
        break
      } else {
        forAspirate(command.params, invariantContext, robotStateAndWarnings)
      }
      break

    case 'dispense':
      if (command.meta?.isAirGap === true) {
        break
      } else {
        forDispense(command.params, invariantContext, robotStateAndWarnings)
      }
      break

    case 'blowout':
      forBlowout(command.params, invariantContext, robotStateAndWarnings)
      break

    case 'dropTip':
      forDropTip(command.params, invariantContext, robotStateAndWarnings)
      break

    case 'pickUpTip':
      forPickUpTip(command.params, invariantContext, robotStateAndWarnings)
      break

    case 'magneticModule/engage':
      forEngageMagnet(command.params, invariantContext, robotStateAndWarnings)
      break

    case 'magneticModule/disengage':
      forDisengageMagnet(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'moveLabware':
      forMoveLabware(command.params, invariantContext, robotStateAndWarnings)
      break

    // the following commands currently don't effect tracked robot state
    case 'touchTip': // pipetting
    case 'configureForVolume':
    case 'loadPipette': // setup VVV
    case 'loadLabware':
    case 'loadModule':
    case 'home': // gantry VVV
    case 'moveRelative':
    case 'moveToAddressableArea':
    case 'moveToAddressableAreaForDropTip':
    case 'moveToSlot':
    case 'moveToCoordinates':
    case 'moveToWell':
    case 'savePosition':
    case 'waitForResume': // timing VVV
    case 'waitForDuration':
    case 'pause': // deprecated, use waitForResume instead
    case 'delay': // deprecated, use waitForDuration instead
    case 'custom': // fall-back
    case 'comment':
      break

    case 'loadLiquid':
      forLoadLiquid(command.params, invariantContext, robotStateAndWarnings)
      break

    case 'aspirateInPlace':
      forAspirateInPlace(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'dropTipInPlace':
      forDropTipInPlace(command.params, invariantContext, robotStateAndWarnings)
      break

    case 'blowOutInPlace':
      forBlowOutInPlace(command.params, invariantContext, robotStateAndWarnings)
      break

    case 'dispenseInPlace':
      forDispenseInPlace(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'configureNozzleLayout':
      forConfigureNozzleLayout(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'temperatureModule/setTargetTemperature':
      forSetTemperature(command.params, invariantContext, robotStateAndWarnings)
      break

    case 'temperatureModule/deactivate':
      forDeactivateTemperature(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'temperatureModule/waitForTemperature':
      forAwaitTemperature(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/setTargetBlockTemperature':
      forThermocyclerSetTargetBlockTemperature(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/setTargetLidTemperature':
      forThermocyclerSetTargetLidTemperature(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/waitForBlockTemperature':
      forThermocyclerAwaitBlockTemperature(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/waitForLidTemperature':
      forThermocyclerAwaitLidTemperature(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/deactivateBlock':
      forThermocyclerDeactivateBlock(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/deactivateLid':
      forThermocyclerDeactivateLid(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/closeLid':
      forThermocyclerCloseLid(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/openLid':
      forThermocyclerOpenLid(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/runProfile':
      forThermocyclerRunProfile(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break

    case 'thermocycler/awaitProfileComplete':
      forThermocyclerAwaitProfileComplete(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'heaterShaker/deactivateHeater':
      forHeaterShakerDeactivateHeater(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'heaterShaker/setTargetTemperature':
      forHeaterShakerSetTargetTemperature(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'heaterShaker/setAndWaitForShakeSpeed':
      forHeaterShakerSetTargetShakeSpeed(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'heaterShaker/deactivateShaker':
      forHeaterShakerStopShake(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'heaterShaker/openLabwareLatch':
      forHeaterShakerOpenLatch(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'heaterShaker/closeLabwareLatch':
      forHeaterShakerCloseLatch(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    //  no state updates required
    case 'heaterShaker/waitForTemperature':
      break
    case 'absorbanceReader/openLid':
      forAbsorbanceReaderOpenLid(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'absorbanceReader/closeLid':
      forAbsorbanceReaderCloseLid(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'absorbanceReader/initialize':
      forAbsorbanceReaderInitialize(
        command.params,
        invariantContext,
        robotStateAndWarnings
      )
      break
    case 'absorbanceReader/read':
      break
    default:
      assert(
        false,
        `unknown command: ${command.commandType} passed to getNextRobotStateAndWarning`
      )
  }
}

export function getNextRobotStateAndWarningsSingleCommand(
  command: CreateCommand,
  invariantContext: InvariantContext,
  prevRobotState: RobotState
): RobotStateAndWarnings {
  const prevState = {
    warnings: [],
    robotState: prevRobotState,
  }
  return produce(prevState, draft => {
    _getNextRobotStateAndWarningsSingleCommand(command, invariantContext, draft)
  })
}
// Get next state after multiple commands
export function getNextRobotStateAndWarnings(
  commands: CreateCommand[],
  invariantContext: InvariantContext,
  initialRobotState: RobotState
): RobotStateAndWarnings {
  const prevState = {
    warnings: [],
    robotState: initialRobotState,
  }
  const strippedCommands = stripNoOpCommands(commands)
  return produce(prevState, draft => {
    strippedCommands.forEach(command => {
      _getNextRobotStateAndWarningsSingleCommand(
        command,
        invariantContext,
        draft
      )
    })
  })
}
