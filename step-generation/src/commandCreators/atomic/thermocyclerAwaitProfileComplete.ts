import { uuid } from '../../utils'
import type { ModuleOnlyParams } from '@opentrons/shared-data/protocol/types/schemaV4'
import type { CommandCreator } from '../../types'
export const thermocyclerAwaitProfileComplete: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  return {
    commands: [
      {
        commandType: 'thermocycler/awaitProfileComplete',
        key: uuid(),
        params: {
          moduleId: args.module,
        },
      },
    ],
  }
}
