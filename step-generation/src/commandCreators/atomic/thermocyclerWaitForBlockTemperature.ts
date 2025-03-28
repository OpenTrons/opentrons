import { uuid } from '../../utils'
import type { ModuleOnlyParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'
export const thermocyclerWaitForBlockTemperature: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  // NOTE: there is no python equivelent for this command since `set_block_temperature()` already
  // sets and waits for the temperature to be reached
  return {
    commands: [
      {
        commandType: 'thermocycler/waitForBlockTemperature',
        key: uuid(),
        params: {
          moduleId: args.moduleId,
        },
      },
    ],
  }
}
