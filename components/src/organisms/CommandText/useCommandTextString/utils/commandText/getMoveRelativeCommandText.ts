import type { MoveRelativeRunTimeCommand } from '@opentrons/shared-data/command'
import type { HandlesCommands } from '../types'

export function getMoveRelativeCommandText({
  command,
  t,
}: HandlesCommands<MoveRelativeRunTimeCommand>): string {
  const { axis, distance } = command.params

  return t('move_relative', { axis, distance })
}
