import {
  findThermocyclerProfileRepetitions,
  formatPyStr,
  indentPyLines,
  uuid,
} from '../../utils'
import type { TCProfileParams } from '@opentrons/shared-data'
import type { CommandCreator } from '../../types'
export const thermocyclerRunProfile: CommandCreator<TCProfileParams> = (
  args,
  invariantContext,
  prevRobotState
) => {
  const { moduleId, profile, blockMaxVolumeUl } = args
  const pythonName = invariantContext.moduleEntities[args.moduleId].pythonName
  const {
    repeatingProfileSteps,
    numRepetitions,
  } = findThermocyclerProfileRepetitions(profile)

  const steps = repeatingProfileSteps
    ?.map(
      step =>
        `{${formatPyStr('temperature')}: ${step.celsius}, ${formatPyStr(
          'hold_time_seconds'
        )}: ${step.holdSeconds}},`
    )
    .join('\n')
  const formattedSteps = '[\n' + `${indentPyLines(steps)}` + '\n],'
  const profileArgs =
    `${formattedSteps}\n` +
    `${numRepetitions},\n` +
    `block_max_volume=${blockMaxVolumeUl},`

  return {
    commands: [
      {
        commandType: 'thermocycler/runProfile',
        key: uuid(),
        params: {
          moduleId,
          profile: profile.map(profileItem => ({
            holdSeconds: profileItem.holdSeconds,
            celsius: profileItem.celsius,
          })),
          blockMaxVolumeUl,
        },
      },
    ],
    python: `${pythonName}.execute_profile(\n${indentPyLines(profileArgs)}\n)`,
  }
}
