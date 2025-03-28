import * as errorCreators from '../../errorCreators'
import { absorbanceReaderStateGetter } from '../../robotStateSelectors'
import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { absorbanceReaderCloseLid, absorbanceReaderRead } from '../atomic'

import type {
  AbsorbanceReaderReadArgs,
  CommandCreator,
  CommandCreatorError,
  CurriedCommandCreator,
} from '../../types'

export const absorbanceReaderCloseRead: CommandCreator<AbsorbanceReaderReadArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const errors: CommandCreatorError[] = []
  const absorbanceReaderState = absorbanceReaderStateGetter(
    prevRobotState,
    args.moduleId
  )
  if (absorbanceReaderState == null || args.moduleId == null) {
    errors.push(errorCreators.missingModuleError())
  }
  if (absorbanceReaderState?.initialization == null) {
    errors.push(errorCreators.absorbanceReaderNoInitialization())
  }
  if (errors.length > 0) {
    return { errors }
  }
  const { moduleId, fileName } = args
  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(absorbanceReaderCloseLid, {
      moduleId,
    }),
    curryCommandCreator(absorbanceReaderRead, {
      moduleId,
      fileName,
    }),
  ]
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
