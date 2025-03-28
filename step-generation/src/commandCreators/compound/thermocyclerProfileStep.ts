import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { thermocyclerStateGetter } from '../../robotStateSelectors'
import * as errorCreators from '../../errorCreators'
import { thermocyclerWaitForLidTemperature } from '../atomic/thermocyclerWaitForLidTemperature'
import { thermocyclerRunProfile } from '../atomic/thermocyclerRunProfile'
import { thermocyclerSetTargetLidTemperature } from '../atomic/thermocyclerSetTargetLidTemperature'
import { thermocyclerCloseLid } from '../atomic/thermocyclerCloseLid'
import { thermocyclerStateStep } from './thermocyclerStateStep'
import type {
  CommandCreator,
  CurriedCommandCreator,
  ThermocyclerProfileStepArgs,
} from '../../types'
export const thermocyclerProfileStep: CommandCreator<ThermocyclerProfileStepArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const {
    blockTargetTempHold,
    lidTargetTempHold,
    lidOpenHold,
    moduleId,
    profileSteps,
    profileTargetLidTemp,
    profileVolume,
  } = args
  const thermocyclerState = thermocyclerStateGetter(prevRobotState, moduleId)

  if (thermocyclerState === null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }

  const commandCreators: CurriedCommandCreator[] = []

  if (thermocyclerState.lidOpen !== false) {
    commandCreators.push(
      curryCommandCreator(thermocyclerCloseLid, {
        moduleId,
      })
    )
  }

  if (profileTargetLidTemp !== thermocyclerState.lidTargetTemp) {
    commandCreators.push(
      curryCommandCreator(thermocyclerSetTargetLidTemperature, {
        moduleId,
        celsius: profileTargetLidTemp,
      })
    )
    commandCreators.push(
      curryCommandCreator(thermocyclerWaitForLidTemperature, {
        moduleId,
      })
    )
  }

  commandCreators.push(
    curryCommandCreator(thermocyclerRunProfile, {
      moduleId,
      profile: profileSteps.map(step => ({
        celsius: step.temperature,
        holdSeconds: step.holdTime,
      })),
      blockMaxVolumeUl: profileVolume,
    })
  )

  commandCreators.push(
    curryCommandCreator(thermocyclerStateStep, {
      commandCreatorFnName: 'thermocyclerState',
      moduleId: moduleId,
      blockTargetTemp: blockTargetTempHold,
      lidTargetTemp: lidTargetTempHold,
      lidOpen: lidOpenHold,
    })
  )
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
