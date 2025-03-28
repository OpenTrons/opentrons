import { findLastAt } from './helpers'
import type { RunTimeCommand } from '@opentrons/shared-data'
/**
 * given a list of commands and a labwareId, calculate the resulting location
 * of the corresponding labware after all given commands are executed
 * @param commands list of commands to search within
 * @returns The last command related to addressable areas.
 */
export function getFinalMoveToAddressableAreaCmd(
  commands: RunTimeCommand[]
): RunTimeCommand | null {
  const [cmd] = findLastAt(
    commands,
    (c: RunTimeCommand) =>
      c.commandType === 'moveToAddressableArea' ||
      c.commandType === 'moveToAddressableAreaForDropTip'
  )

  return cmd ?? null
}
