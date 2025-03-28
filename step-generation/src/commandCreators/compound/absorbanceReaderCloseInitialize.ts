import * as errorCreators from '../../errorCreators'
import { absorbanceReaderStateGetter } from '../../robotStateSelectors'
import { curryCommandCreator, reduceCommandCreators } from '../../utils'
import { absorbanceReaderCloseLid, absorbanceReaderInitialize } from '../atomic'

import type {
  AbsorbanceReaderInitializeArgs,
  CommandCreator,
  CommandCreatorError,
  CurriedCommandCreator,
} from '../../types'

export const absorbanceReaderCloseInitialize: CommandCreator<AbsorbanceReaderInitializeArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { moduleId, measureMode, sampleWavelengths, referenceWavelength } = args
  const absorbanceReaderState = absorbanceReaderStateGetter(
    prevRobotState,
    moduleId
  )

  const errors: CommandCreatorError[] = []
  if (absorbanceReaderState == null) {
    errors.push(errorCreators.missingModuleError())
  }

  if (errors.length > 0) {
    return { errors }
  }
  const commandCreators: CurriedCommandCreator[] = [
    curryCommandCreator(absorbanceReaderCloseLid, {
      moduleId,
    }),
    curryCommandCreator(absorbanceReaderInitialize, {
      moduleId,
      measureMode,
      sampleWavelengths,
      referenceWavelength: referenceWavelength ?? undefined,
    }),
  ]
  return reduceCommandCreators(
    commandCreators,
    invariantContext,
    prevRobotState
  )
}
