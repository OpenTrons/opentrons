import { uuid } from '../../utils'
import type { TemperatureParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'
export const thermocyclerSetTargetBlockTemperature: CommandCreator<TemperatureParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  if (args.celsius !== undefined) {
    console.warn(
      `'volume' param not implemented for thermocycler/setTargetBlockTemperature, should not be set!`
    )
  }
  const pythonName = invariantContext.moduleEntities[args.moduleId].pythonName

  return {
    commands: [
      {
        commandType: 'thermocycler/setTargetBlockTemperature',
        key: uuid(),
        params: {
          moduleId: args.moduleId,
          celsius: args.celsius,
          //  TODO( jr 7/17/23): add optional blockMaxVolumeUI and holdTimeSeconds params
        },
      },
    ],
    python: `${pythonName}.set_block_temperature(${args.celsius})`,
  }
}
