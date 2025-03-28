import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import * as errorCreators from '../../errorCreators'
import { getModuleState } from '../../robotStateSelectors'
import { delay } from '../atomic/delay'
import { heaterShakerOpenLatch } from '../atomic/heaterShakerOpenLatch'
import { heaterShakerCloseLatch } from '../atomic/heaterShakerCloseLatch'
import { heaterShakerDeactivateHeater } from '../atomic/heaterShakerDeactivateHeater'
import { setTemperature } from '../atomic/setTemperature'
import { heaterShakerStopShake } from '../atomic/heaterShakerStopShake'
import { heaterShakerSetTargetShakeSpeed } from '../atomic/heaterShakerSetTargetShakeSpeed'

import type {
  CommandCreator,
  CurriedCommandCreator,
  HeaterShakerArgs,
} from '../../types'

export const heaterShaker: CommandCreator<HeaterShakerArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  if (args.moduleId == null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }
  const heaterShakerState = getModuleState(prevRobotState, args.moduleId)

  const moduleId = args.moduleId ?? ''

  if (heaterShakerState == null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }

  const commandCreators: CurriedCommandCreator[] = []

  if (!args.latchOpen) {
    commandCreators.push(
      curryCommandCreator(heaterShakerCloseLatch, {
        moduleId,
      })
    )
  }

  if (args.targetTemperature === null) {
    commandCreators.push(
      curryCommandCreator(heaterShakerDeactivateHeater, {
        moduleId,
      })
    )
  } else {
    commandCreators.push(
      curryCommandCreator(setTemperature, {
        moduleId,
        celsius: args.targetTemperature,
      })
    )
  }

  if (
    args.rpm === null &&
    'targetSpeed' in heaterShakerState &&
    heaterShakerState.targetSpeed !== null
  ) {
    commandCreators.push(
      curryCommandCreator(heaterShakerStopShake, {
        moduleId,
      })
    )
  } else if (args.rpm !== null) {
    commandCreators.push(
      curryCommandCreator(heaterShakerSetTargetShakeSpeed, {
        moduleId,
        rpm: args.rpm,
      })
    )
  }

  if (
    (args.timerMinutes != null && args.timerMinutes !== 0) ||
    (args.timerSeconds != null && args.timerSeconds !== 0)
  ) {
    const totalSeconds =
      (args.timerSeconds ?? 0) + (args.timerMinutes ?? 0) * 60
    commandCreators.push(
      curryCommandCreator(delay, {
        seconds: totalSeconds,
      })
    )
    commandCreators.push(
      curryCommandCreator(heaterShakerStopShake, {
        moduleId: args.moduleId,
      })
    )
    commandCreators.push(
      curryCommandCreator(heaterShakerDeactivateHeater, {
        moduleId: args.moduleId,
      })
    )
  }

  if (args.latchOpen) {
    commandCreators.push(
      curryCommandCreator(heaterShakerOpenLatch, {
        moduleId: args.moduleId,
      })
    )
  }

  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
