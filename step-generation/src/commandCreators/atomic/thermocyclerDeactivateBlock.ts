import { uuid } from '../../utils'
import type { ModuleOnlyParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'
export const thermocyclerDeactivateBlock: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const pythonName = invariantContext.moduleEntities[args.moduleId].pythonName
  return {
    commands: [
      {
        commandType: 'thermocycler/deactivateBlock',
        key: uuid(),
        params: {
          moduleId: args.moduleId,
        },
      },
    ],
    python: `${pythonName}.deactivate_block()`,
  }
}
