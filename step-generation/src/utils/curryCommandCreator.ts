import type { CommandCreator, CurriedCommandCreator } from '../types'

/** Curry a command creator so its args are baked-in,
 * but it is still open to receiving different input states */
export function curryCommandCreator<Args>(
  commandCreator: CommandCreator<Args>,
  args: Args
): CurriedCommandCreator {
  return (_invariantContext, _prevRobotState) =>
    commandCreator(args, _invariantContext, _prevRobotState)
}

/** Curry a CommandCreator but discard any Python code in it.
 * Useful for compound commands when you need to suppress the Python for some of
 * the constituent atomic commands. */
export function curryWithoutPython<Args>(
  commandCreator: CommandCreator<Args>,
  args: Args
): CurriedCommandCreator {
  return (_invariantContext, _prevRobotState) => {
    const commandCreatorResult = commandCreator(
      args,
      _invariantContext,
      _prevRobotState
    )
    if ('python' in commandCreatorResult) {
      const { python, ...resultWithoutPython } = commandCreatorResult
      return resultWithoutPython
    }
    return commandCreatorResult
  }
}
