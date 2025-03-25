import { uuid } from '../../utils'
import * as errorCreators from '../../errorCreators'
import { absorbanceReaderStateGetter } from '../../robotStateSelectors'
import type { AbsorbanceReaderCloseLidCreateCommand } from '@opentrons/shared-data'
import type { CommandCreator, CommandCreatorError } from '../../types'

export const absorbanceReaderCloseLid: CommandCreator<
  AbsorbanceReaderCloseLidCreateCommand['params']
> = (args, invariantContext, prevRobotState) => {
  const { gripperEntities, moduleEntities } = invariantContext
  const absorbanceReaderState = absorbanceReaderStateGetter(
    prevRobotState,
    args.moduleId
  )
  const hasGripperEntity = Object.keys(gripperEntities).length > 0
  const errors: CommandCreatorError[] = []
  if (args.moduleId == null || absorbanceReaderState == null) {
    errors.push(errorCreators.missingModuleError())
  }
  if (!hasGripperEntity) {
    errors.push(errorCreators.absorbanceReaderNoGripper())
  }
  if (errors.length > 0) {
    return { errors }
  }
  const pythonName = moduleEntities[args.moduleId].pythonName

  return {
    commands: [
      {
        commandType: 'absorbanceReader/closeLid',
        key: uuid(),
        params: {
          moduleId: args.moduleId,
        },
      },
    ],
    python: `${pythonName}.close_lid()`,
  }
}
