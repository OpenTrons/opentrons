import { uuid } from '../../utils'
import type { ModuleOnlyParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'
export const thermocyclerCloseLid: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const pythonName = invariantContext.moduleEntities[args.moduleId].pythonName
  return {
    commands: [
      {
        commandType: 'thermocycler/closeLid',
        key: uuid(),
        params: {
          moduleId: args.moduleId,
        },
      },
    ],
    python: `${pythonName}.close_lid()`,
  }
}
