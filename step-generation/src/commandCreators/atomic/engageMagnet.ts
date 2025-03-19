import assert from 'assert'
import { MAGNETIC_MODULE_TYPE } from '@opentrons/shared-data'
import { uuid } from '../../utils'
import * as errorCreators from '../../errorCreators'
import type { EngageMagnetParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'

/** Engage magnet of specified magnetic module to given engage height. */
export const engageMagnet: CommandCreator<EngageMagnetParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { moduleId, height } = args
  const { moduleEntities } = invariantContext
  const commandType = 'magneticModule/engage'

  if (moduleId === null) {
    return {
      errors: [errorCreators.missingModuleError()],
    }
  }

  assert(
    moduleEntities[moduleId]?.type === MAGNETIC_MODULE_TYPE,
    `expected module ${moduleId} to be magdeck, got ${moduleEntities[moduleId]?.type}`
  )

  const pythonName = moduleEntities[moduleId].pythonName

  return {
    commands: [
      {
        commandType,
        key: uuid(),
        params: {
          moduleId,
          height,
        },
      },
    ],
    python: `${pythonName}.engage(height_from_base=${height})`,
  }
}
