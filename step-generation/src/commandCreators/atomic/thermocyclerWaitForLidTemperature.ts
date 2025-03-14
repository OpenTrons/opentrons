import { uuid } from '../../utils'
import type { ModuleOnlyParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'
export const thermocyclerWaitForLidTemperature: CommandCreator<ModuleOnlyParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  // NOTE: there is no python equivelent for this command since `set_lid_temperature()` already
  // sets and waits for the temperature to be reached
  return {
    commands: [
      {
        commandType: 'thermocycler/waitForLidTemperature',
        key: uuid(),
        params: {
          moduleId: args.moduleId,
        },
      },
    ],
  }
}
