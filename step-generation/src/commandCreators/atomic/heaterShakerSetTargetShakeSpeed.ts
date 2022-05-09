import assert from 'assert'
import { HEATERSHAKER_MODULE_TYPE } from '@opentrons/shared-data'
import { CommandCreator, SetShakeSpeedArgs } from '../../types'
import * as errorCreators from '../../errorCreators'

export const heaterShakerSetTargetShakeSpeed: CommandCreator<SetShakeSpeedArgs> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { moduleId, rpm } = args

  if (module === null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }

  assert(
    invariantContext.moduleEntities[moduleId]?.type ===
      HEATERSHAKER_MODULE_TYPE,
    `expected module ${moduleId} to be heaterShaker, got ${invariantContext.moduleEntities[moduleId]?.type}`
  )

  return {
    commands: [
      {
        commandType: 'heaterShaker/setAndWaitForShakeSpeed',
        params: {
          moduleId,
          rpm,
        },
      },
    ],
  }
}
