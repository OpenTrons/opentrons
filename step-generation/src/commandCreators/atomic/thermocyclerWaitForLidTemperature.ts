import type { ModuleOnlyParams } from '@opentrons/shared-data/protocol/types/schemaV4'
import type { CommandCreator } from '../../types'
export const thermocyclerWaitForLidTemperature: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  return {
    commands: [
      {
        commandType: 'thermocycler/waitForLidTemperature',
        params: {
          moduleId: args.module,
        },
      },
    ],
  }
}
