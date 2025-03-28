import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { thermocyclerStateDiff } from '../../utils/thermocyclerStateDiff'
import { thermocyclerStateGetter } from '../../robotStateSelectors'
import * as errorCreators from '../../errorCreators'
import { thermocyclerWaitForBlockTemperature } from '../atomic/thermocyclerWaitForBlockTemperature'
import { thermocyclerWaitForLidTemperature } from '../atomic/thermocyclerWaitForLidTemperature'
import { thermocyclerCloseLid } from '../atomic/thermocyclerCloseLid'
import { thermocyclerDeactivateBlock } from '../atomic/thermocyclerDeactivateBlock'
import { thermocyclerDeactivateLid } from '../atomic/thermocyclerDeactivateLid'
import { thermocyclerOpenLid } from '../atomic/thermocyclerOpenLid'
import { thermocyclerSetTargetBlockTemperature } from '../atomic/thermocyclerSetTargetBlockTemperature'
import { thermocyclerSetTargetLidTemperature } from '../atomic/thermocyclerSetTargetLidTemperature'
import type {
  CommandCreator,
  CurriedCommandCreator,
  ThermocyclerStateStepArgs,
} from '../../types'
export const thermocyclerStateStep: CommandCreator<ThermocyclerStateStepArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const thermocyclerState = thermocyclerStateGetter(
    prevRobotState,
    args.moduleId
  )

  if (thermocyclerState === null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }

  const {
    lidOpen,
    lidClosed,
    setBlockTemperature,
    deactivateBlockTemperature,
    setLidTemperature,
    deactivateLidTemperature,
  } = thermocyclerStateDiff(thermocyclerState, args)
  const { blockTargetTemp, lidTargetTemp } = args
  const commandCreators: CurriedCommandCreator[] = []

  if (lidOpen) {
    commandCreators.push(
      curryCommandCreator(thermocyclerOpenLid, {
        moduleId: args.moduleId,
      })
    )
  }

  if (lidClosed) {
    commandCreators.push(
      curryCommandCreator(thermocyclerCloseLid, {
        moduleId: args.moduleId,
      })
    )
  }

  if (deactivateBlockTemperature) {
    commandCreators.push(
      curryCommandCreator(thermocyclerDeactivateBlock, {
        moduleId: args.moduleId,
      })
    )
  }

  if (blockTargetTemp !== null && setBlockTemperature) {
    commandCreators.push(
      curryCommandCreator(thermocyclerSetTargetBlockTemperature, {
        moduleId: args.moduleId,
        celsius: blockTargetTemp,
      })
    )
    commandCreators.push(
      curryCommandCreator(thermocyclerWaitForBlockTemperature, {
        moduleId: args.moduleId,
      })
    )
  }

  if (deactivateLidTemperature) {
    commandCreators.push(
      curryCommandCreator(thermocyclerDeactivateLid, {
        moduleId: args.moduleId,
      })
    )
  }

  if (lidTargetTemp !== null && setLidTemperature) {
    commandCreators.push(
      curryCommandCreator(thermocyclerSetTargetLidTemperature, {
        moduleId: args.moduleId,
        celsius: lidTargetTemp,
      })
    )
    commandCreators.push(
      curryCommandCreator(thermocyclerWaitForLidTemperature, {
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
