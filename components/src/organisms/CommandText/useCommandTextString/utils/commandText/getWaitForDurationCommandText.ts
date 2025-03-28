import type { WaitForDurationRunTimeCommand } from '@opentrons/shared-data/command'
import type { HandlesCommands } from '../types'

export function getWaitForDurationCommandText({
  command,
  t,
}: HandlesCommands<WaitForDurationRunTimeCommand>): string {
  const { seconds, message } = command.params

  return t('wait_for_duration', { seconds, message: message ?? '' })
}
